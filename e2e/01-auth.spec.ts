import type { BrowserContext, Page } from "@playwright/test"
import { test, expect, signIn, toast, asRole } from "./support/test"
import { ACCOUNTS, sessionFile } from "./support/accounts"
import { policyDefect, watchSecurityPolicy } from "./support/page-health"

const hasSession = async (context: BrowserContext) => (await context.cookies()).some((cookie) => cookie.name === "token")

/**
 * Watches what the frontend answers: the session cookie belongs to the API alone (set at
 * sign-in, cleared at sign-out). Returns the addresses of the frontend that wrote it anyway.
 */
function watchSessionCookieWrites(page: Page) {
  const pending: Promise<void>[] = []
  const written: string[] = []
  page.on("response", (response) => {
    // The API itself, at its own address or behind the address of the site.
    if (new URL(response.url()).pathname.endsWith("/graphql")) return
    pending.push(
      response
        .headerValue("set-cookie")
        .then((header) => {
          if (header && /(^|[\n,]\s*)token=/.test(header)) written.push(response.url())
        })
        .catch(() => undefined),
    )
  })
  return async () => {
    await Promise.all(pending)
    return written
  }
}

/** Signs out from the side bar and checks that the session is gone, and stays gone. */
async function signOutForGood(page: Page) {
  const cookieWrites = watchSessionCookieWrites(page)
  await page.getByRole("button", { name: "Se déconnecter" }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible()

  // Answers still on their way when the member clicked (a production build prefetches the
  // links of the menu) have all arrived: none of them brought the session back.
  await page.waitForLoadState("networkidle")
  expect(await hasSession(page.context()), "cookie de session après la déconnexion").toBe(false)

  // A protected page sends back to the "not connected" page.
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/system\/notconnected$/)
  expect(await hasSession(page.context()), "cookie de session après une navigation").toBe(false)
  expect(await cookieWrites(), "réponses du frontend qui écrivent le cookie de session").toEqual([])
}

test.describe("Connexion", () => {
  test("un membre se connecte puis se déconnecte", async ({ page }) => {
    await signIn(page, "pilot")
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole("heading", { level: 1, name: "Bienvenue, Jean" })).toBeVisible()

    expect(await hasSession(page.context())).toBe(true)

    await signOutForGood(page)
  })

  // The frontend used to send the session cookie back with every page it served: the answer
  // to a link prefetch, arriving after the API had cleared the cookie, signed the member in
  // again. Seen on a production build only (a development server does not prefetch), and not
  // every time: hence several sign-outs, each as soon as the page shows, links still loading.
  // The API keeps no list of sessions, so the saved session opens a new one each time without
  // signing in again (sign-ins are limited per minute).
  test("la déconnexion tient, plusieurs fois de suite, pendant le préchargement des liens", async ({ browser }) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      await test.step(`déconnexion ${attempt}`, () =>
        asRole(browser, "pilot", async (page) => {
          await page.goto("/dashboard", { waitUntil: "commit" })
          await signOutForGood(page)
        }),
      )
    }
  })

  // Ordinary navigation keeps the session as the API set it at sign-in.
  test("un membre connecté le reste en naviguant", async ({ browser }) => {
    await asRole(browser, "pilot", async (page) => {
      const cookieWrites = watchSessionCookieWrites(page)
      const sidebar = page.getByRole("navigation", { name: "Navigation principale" })
      await page.goto("/dashboard")
      const session = (await page.context().cookies()).find((cookie) => cookie.name === "token")
      expect(session, "cookie de session").toBeTruthy()

      for (const [link, url] of [["Carnet de vol", /\/logbook$/], ["Tableau de bord", /\/dashboard$/]] as const) {
        await sidebar.getByRole("link", { name: link, exact: true }).click()
        await expect(page).toHaveURL(url)
        await expect(sidebar).toContainText(ACCOUNTS.pilot.name)
      }
      await page.reload()
      await expect(sidebar).toContainText(ACCOUNTS.pilot.name)
      await page.waitForLoadState("networkidle")

      // Same cookie, same expiry: nothing rewrote it on the way.
      const after = (await page.context().cookies()).find((cookie) => cookie.name === "token")
      expect(after).toEqual(session)
      expect(await cookieWrites(), "réponses du frontend qui écrivent le cookie de session").toEqual([])
    })
  })

  test("un mot de passe erroné affiche l'erreur", async ({ page }) => {
    await signIn(page, "pilot", "not-the-password")
    await expect(toast(page, "Erreur de connexion")).toBeVisible()
    await expect(page.getByText("Identifiants incorrects.").first()).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
  })
})

test.describe("Pages ouvertes sans session", () => {
  for (const path of ["/", "/auth/forgot-password", "/system/notconnected"]) {
    test(`${path} respecte la politique de sécurité du contenu`, async ({ page }) => {
      const violations = watchSecurityPolicy(page)

      const response = await page.goto(path)
      expect(policyDefect(response?.headers() ?? {}), "politique de sécurité du contenu").toBeNull()
      // The page runs its scripts: nothing would show without them.
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      await page.waitForLoadState("networkidle")

      expect(violations, "refus du navigateur").toEqual([])
    })
  }
})

test.describe("Droits d'un pilote", () => {
  test.use({ storageState: sessionFile("pilot") })

  test("le menu Administration n'est pas proposé et la page est refusée", async ({ page }) => {
    await page.goto("/dashboard")
    const sidebar = page.getByRole("navigation", { name: "Navigation principale" })
    // The profile decides what the menu shows: wait for it before asserting an absence.
    await expect(sidebar).toContainText(ACCOUNTS.pilot.name)
    await expect(sidebar.getByRole("link", { name: "Carnet de vol" })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Administration" })).toHaveCount(0)

    await page.goto("/administration")
    await expect(page).toHaveURL(/\/system\/unauthorized$/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  // The two-factor setup lives under /administration but belongs to every member.
  test("la double authentification reste accessible", async ({ page }) => {
    await page.goto("/administration/2fa")
    await expect(page).toHaveURL(/\/administration\/2fa$/)
    await expect(page.getByRole("heading", { level: 1, name: "Authentification à deux facteurs" })).toBeVisible()
  })
})

test.describe("Droits d'un instructeur", () => {
  test.use({ storageState: sessionFile("instructor") })

  test("le menu Administration mène aux modèles de checklist, le reste est refusé", async ({ page }) => {
    await page.goto("/dashboard")
    const sidebar = page.getByRole("navigation", { name: "Navigation principale" })
    await expect(sidebar).toContainText(ACCOUNTS.instructor.name)

    await sidebar.getByRole("link", { name: "Administration" }).click()
    await expect(page).toHaveURL(/\/administration\/checklists$/)
    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible()

    for (const refused of ["/administration", "/administration/users", "/administration/incidents"]) {
      await page.goto(refused)
      await expect(page).toHaveURL(/\/system\/unauthorized$/)
    }
  })
})
