import { test, expect, LANGUAGE_KEY } from "./support/test"
import { sessionFile } from "./support/accounts"

test.use({ storageState: sessionFile("admin") })

const FRENCH_LONG_DATE = /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) \d{1,2} (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) \d{4}$/
const ENGLISH_LONG_DATE = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/

// The choice lives in the browser only: nothing to restore on the server.
test("la langue passe en anglais depuis la barre du haut, puis revient au français", async ({ page }) => {
  await page.goto("/reservations")
  const sidebarFr = page.getByRole("navigation", { name: "Navigation principale" })
  await expect(page.getByRole("heading", { level: 1, name: "Calendrier des réservations" })).toBeVisible()
  await expect(sidebarFr.getByRole("link", { name: "Tableau de bord", exact: true })).toBeVisible()
  // The calendar shows today's date in full.
  await expect(page.getByRole("main").getByRole("button", { name: FRENCH_LONG_DATE })).toBeVisible()

  await test.step("anglais", async () => {
    await page.getByRole("banner").getByRole("button", { name: "Changer de langue" }).click()
    await page.getByRole("menuitem", { name: "English" }).click()

    const sidebar = page.getByRole("navigation", { name: "Main navigation" })
    await expect(sidebar.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Fleet" })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Logbook" })).toBeVisible()
    await expect(sidebar.getByRole("button", { name: "Sign out" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Booking calendar" })).toBeVisible()
    await expect(page.getByRole("main").getByRole("button", { name: "Today" })).toBeVisible()
    await expect(page.getByRole("main").getByRole("button", { name: ENGLISH_LONG_DATE })).toBeVisible()
    await expect(page.locator("html")).toHaveAttribute("lang", "en")
    expect(await page.evaluate((key) => window.localStorage.getItem(key), LANGUAGE_KEY)).toBe("en")

    // The choice survives a navigation.
    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { level: 1, name: "Welcome, Demo" })).toBeVisible()
  })

  await test.step("retour au français", async () => {
    await page.getByRole("banner").getByRole("button", { name: "Change language" }).click()
    await page.getByRole("menuitem", { name: "Français" }).click()

    await expect(page.getByRole("heading", { level: 1, name: "Bienvenue, Demo" })).toBeVisible()
    await expect(sidebarFr.getByRole("link", { name: "Tableau de bord", exact: true })).toBeVisible()
    await expect(page.locator("html")).toHaveAttribute("lang", "fr")
    expect(await page.evaluate((key) => window.localStorage.getItem(key), LANGUAGE_KEY)).toBe("fr")
  })
})
