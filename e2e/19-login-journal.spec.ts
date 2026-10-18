import type { Page } from "@playwright/test"
import { test, expect, choose, asRole } from "./support/test"
import { ACCOUNTS, DEMO_PASSWORD } from "./support/accounts"

// Who signs in to which account: every attempt leaves a line, the administrator reads them all and
// each member reads their own. Three attempts in a fresh window (an address nobody has, a wrong
// password, then the right one): well under the limit of sign-ins a minute.

const lines = (page: Page) => page.getByRole("table").getByRole("row").filter({ has: page.getByRole("cell") })

// The API allows 5 attempts in 10 seconds and 10 a minute from one address, and the setup of the
// suite may have just signed in: an attempt refused for that is made again once the window passed
// (the refusal itself is logged as « Trop de tentatives »).
const THROTTLE_WINDOW_MS = 11_000

/** Signs in from the home page; returns the errors of the API, none when the session opened. */
async function attempt(page: Page, email: string, password: string): Promise<string> {
  for (let tries = 0; tries < 7; tries++) {
    await page.goto("/")
    await page.getByLabel("Adresse e-mail").fill(email)
    await page.getByLabel("Mot de passe").fill(password)
    const answer = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith("/graphql") &&
        (response.request().postData() ?? "").includes('"operationName":"Login"'),
    )
    await page.getByRole("button", { name: "Se connecter" }).click()
    const errors = JSON.stringify((await (await answer).json()).errors ?? [])
    if (!errors.includes("Too Many Requests")) return errors
    await new Promise((resolve) => setTimeout(resolve, THROTTLE_WINDOW_MS))
  }
  throw new Error("sign-in still refused for too many attempts")
}

test("le journal des connexions retient chaque tentative, pour l'administrateur et pour le membre", async ({ page, browser }) => {
  const unknownAddress = `e2e-${Date.now()}@inconnu.invalid`

  await test.step("une adresse inconnue puis un mauvais mot de passe sont refusés", async () => {
    expect(await attempt(page, unknownAddress, "pas-le-bon-1234")).toContain("Invalid credentials")
    await expect(page.getByText("Identifiants incorrects.").first()).toBeVisible()

    expect(await attempt(page, ACCOUNTS.pilot.email, "pas-le-bon-1234")).toContain("Invalid credentials")
    await expect(page.getByText("Identifiants incorrects.").first()).toBeVisible()
  })

  await test.step("le pilote se connecte et voit ses dernières connexions dans son profil", async () => {
    expect(await attempt(page, ACCOUNTS.pilot.email, DEMO_PASSWORD)).toBe("[]")
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/profile")
    await page.getByRole("tab", { name: "Sécurité" }).click()
    const security = page.getByRole("tabpanel", { name: "Sécurité" })
    await expect(security.getByText("Mes dernières connexions")).toBeVisible()
    await expect(security.getByText("Une connexion que vous ne reconnaissez pas ? Changez votre mot de passe.")).toBeVisible()
    const rows = security.getByRole("table").getByRole("row").filter({ has: page.getByRole("cell") })
    // Newest first: the sign-in just made; the wrong password before it.
    await expect(rows.first()).toContainText("Connexion réussie")
    await expect(rows.filter({ hasText: "Mot de passe erroné" }).first()).toBeVisible()
    await expect(rows.first()).toContainText("Chrome")
    // The address nobody has belongs to no account: it is not in the pilot's lines.
    await expect(security).not.toContainText(unknownAddress)
  })

  await asRole(browser, "admin", async (admin) => {
    await test.step("l'administrateur retrouve l'adresse inconnue dans le journal", async () => {
      await admin.goto("/administration/logins")
      await expect(admin.getByRole("heading", { level: 1, name: "Journal des connexions" })).toBeVisible()
      await choose(admin, admin.getByRole("combobox", { name: "Résultat" }), "Compte inconnu")
      await expect(lines(admin).filter({ hasText: unknownAddress })).toHaveCount(1)
      await expect(lines(admin).first()).toContainText("Compte inconnu")
    })

    await test.step("puis les tentatives du pilote, avec l'appareil et l'adresse IP", async () => {
      await admin.getByRole("button", { name: "Effacer les filtres" }).first().click()
      await choose(admin, admin.getByRole("combobox", { name: "Compte" }), "Dupont Jean")
      await choose(admin, admin.getByRole("combobox", { name: "Période" }), "Dernières 24 heures")
      const pilot = lines(admin)
      await expect(pilot.first()).toContainText(ACCOUNTS.pilot.name)
      await expect(pilot.first()).toContainText("Connexion réussie")
      await expect(pilot.filter({ hasText: "Mot de passe erroné" }).first()).toBeVisible()
      await expect(pilot.first().getByRole("cell").last()).toHaveText(/^[0-9a-f.:]+$/i)
    })

    await test.step("la fiche du membre donne sa dernière connexion et mène à ses lignes", async () => {
      await admin.goto("/administration/users")
      await admin.getByRole("searchbox", { name: "Rechercher un membre" }).fill(ACCOUNTS.pilot.email)
      await admin.getByRole("button", { name: `Actions pour ${ACCOUNTS.pilot.name}` }).click()
      await admin.getByRole("menuitem", { name: "Voir la fiche" }).click()
      const sheet = admin.getByRole("dialog", { name: new RegExp(`^${ACCOUNTS.pilot.name}`) })
      const last = sheet.locator("dt", { hasText: "Dernière connexion" }).locator("xpath=following-sibling::dd[1]")
      await expect(last).toContainText(/\d{2}:\d{2}/)
      await sheet.getByRole("link", { name: "Voir ses connexions" }).click()
      await expect(admin).toHaveURL(/\/administration\/logins\?member=\d+$/)
      await expect(lines(admin).first()).toContainText(ACCOUNTS.pilot.name)
    })

    await test.step("sur un téléphone, une carte par connexion et rien ne déborde", async () => {
      await admin.setViewportSize({ width: 390, height: 844 })
      await admin.goto("/administration/logins")
      const cards = admin.getByRole("list", { name: "Journal des connexions" }).getByRole("listitem")
      await expect(cards.first()).toBeVisible()
      await expect(admin.getByRole("table")).toBeHidden()
      const overflow = await admin.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, "défilement horizontal de la page").toBeLessThanOrEqual(0)
    })
  })
})
