import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"
import { test, expect, sidePanel } from "./support/test"
import { sessionFile } from "./support/accounts"
import { openCalendarAhead } from "./support/calendar"

// Automated accessibility check (axe-core) of a representative set of screens, in light mode,
// on a computer and on a phone. A serious or critical violation of WCAG 2.1 A/AA (names of
// buttons and links, labels, roles, landmarks, contrast, keyboard access…) fails the journey.
// Lesser findings (e.g. heading order) are left to a manual audit.
test.use({ colorScheme: "light" })

const PHONE = { width: 375, height: 812 }
const BLOCKING = new Set(["serious", "critical"])

/** Runs axe on the page (or on one part of it) and fails on serious or critical violations. */
async function expectAccessible(page: Page, include?: string) {
  // A window still fading in has washed-out colours: its contrast is measured once it is shown.
  // (A spinner turns for ever: it is not waited for.)
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((animation) => animation.playState !== "running" || animation.effect?.getComputedTiming().iterations === Infinity),
  )
  let axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
  if (include) axe = axe.include(include)
  const { violations } = await axe.analyze()
  const blocking = violations
    .filter((violation) => BLOCKING.has(violation.impact ?? ""))
    .map((violation) => `${violation.impact} ${violation.id}: ${violation.help} — ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)
  expect(blocking, `violations d'accessibilité sur ${page.url()}`).toEqual([])
}

/** Opens a page of the application and waits until its data is shown. */
async function openPage(page: Page, path: string) {
  await page.goto(path)
  const main = page.getByRole("main")
  await expect(main.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(main.locator(".animate-pulse")).toHaveCount(0)
  await page.waitForLoadState("networkidle")
}

test.describe("Sans session", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const [label, viewport] of [["ordinateur", undefined], ["téléphone", PHONE]] as const) {
    test(`la connexion et le mot de passe oublié, sur ${label}`, async ({ page }) => {
      if (viewport) await page.setViewportSize(viewport)
      await page.goto("/")
      await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible()
      await expectAccessible(page)
      await page.goto("/auth/forgot-password")
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      await expectAccessible(page)
    })
  }
})

test.describe("Administrateur", () => {
  test.use({ storageState: sessionFile("admin") })

  const PAGES = [
    "/dashboard",
    "/fleet",
    "/fleet/history",
    "/reservations/my",
    "/logbook",
    "/instruction/courses",
    "/administration/users",
    "/administration/finance",
    "/administration/settings",
  ]

  test("les pages principales, sur ordinateur", async ({ page }) => {
    for (const path of PAGES) {
      await openPage(page, path)
      await expectAccessible(page)
    }
  })

  test("les pages principales et le menu, sur téléphone", async ({ page }) => {
    await page.setViewportSize(PHONE)
    for (const path of PAGES) {
      await openPage(page, path)
      await expectAccessible(page)
    }
    await page.getByRole("button", { name: "Ouvrir le menu" }).click()
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible()
    await expectAccessible(page)
  })
})

test.describe("Pilote", () => {
  test.use({ storageState: sessionFile("pilot") })

  test("le calendrier et le panneau de réservation, au clavier", async ({ page }) => {
    await openCalendarAhead(page)
    await expectAccessible(page)
    // A free slot opens the booking panel from the keyboard; the focus goes into the panel,
    // then back to the slot once the panel is closed.
    const slot = page.getByRole("cell", { name: /^Réserver / }).first()
    await slot.focus()
    await page.keyboard.press("Enter")
    const panel = sidePanel(page, "Créer une réservation")
    await expect(panel.getByLabel("But de la réservation")).toBeFocused()
    await expectAccessible(page, "[role=dialog]")
    await page.keyboard.press("Escape")
    await expect(panel).toBeHidden()
    await expect(slot).toBeFocused()
  })

  test("le profil, ses préférences et la recherche", async ({ page }) => {
    await openPage(page, "/profile")
    await expectAccessible(page)
    await page.getByRole("tab", { name: "Préférences" }).click()
    await expect(page.getByRole("combobox", { name: /^Fuseau horaire/ })).toBeVisible()
    await expectAccessible(page)

    await page.getByRole("button", { name: "Rechercher" }).first().click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expectAccessible(page, "[role=dialog]")
    await page.keyboard.press("Escape")
  })

  test("le tableau de bord et le carnet de vol, sur téléphone", async ({ page }) => {
    await page.setViewportSize(PHONE)
    for (const path of ["/dashboard", "/logbook", "/reservations/flight-plans"]) {
      await openPage(page, path)
      await expectAccessible(page)
    }
  })
})
