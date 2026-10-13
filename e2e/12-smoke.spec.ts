import { test, expect } from "./support/test"
import { sessionFile } from "./support/accounts"
import { rawTranslationKeys, watchConsole } from "./support/page-health"

test.use({ storageState: sessionFile("admin") })

const PAGES = [
  "/dashboard",
  "/fleet",
  "/fleet/history",
  "/fleet/maintenance",
  "/reservations",
  "/reservations/my",
  "/reservations/flight-plans",
  "/checklists",
  "/logbook",
  "/instruction",
  "/instruction/courses",
  "/instruction/evaluation",
  "/instruction/e-learning",
  "/articles",
  "/notifications",
  "/profile",
  "/profile/money_account",
  "/administration",
  "/administration/planes",
  "/administration/users",
  "/administration/finance",
  "/administration/audits",
  "/administration/incidents",
  "/administration/articles",
  "/administration/checklists",
  "/administration/e-learning",
  "/administration/settings",
  "/administration/2fa",
]

// Titles of the error screens: the two error boundaries, the 404 and a failed data load.
const ERROR_SCREENS = [
  "Une erreur est survenue",
  "L'application a rencontré un problème",
  "Page introuvable",
  "Chargement impossible",
]

test.describe("Chaque page principale s'affiche pour l'administrateur", () => {
  for (const path of PAGES) {
    test(path, async ({ page, baseURL }) => {
      const errors = watchConsole(page, baseURL)

      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      const main = page.getByRole("main")
      await expect(main.getByRole("heading", { level: 1 })).toBeVisible()
      // Loading placeholders gone: the data of the page has arrived.
      await expect(main.locator(".animate-pulse")).toHaveCount(0)
      await page.waitForLoadState("networkidle")

      for (const title of ERROR_SCREENS) await expect(page.getByText(title, { exact: true })).toHaveCount(0)
      expect(rawTranslationKeys(await page.locator("body").innerText()), "clés de traduction affichées telles quelles").toEqual([])
      expect(errors, "erreurs dans la console").toEqual([])
    })
  }
})
