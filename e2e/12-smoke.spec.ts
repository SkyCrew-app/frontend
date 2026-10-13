import fs from "node:fs"
import path from "node:path"
import { test, expect } from "./support/test"
import { sessionFile } from "./support/accounts"
import { policyDefect, rawTranslationKeys, watchConsole } from "./support/page-health"
import { stubWeather } from "./support/weather"

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
  "/administration/actions",
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

      const response = await page.goto(path)
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      // Enforced, and scripts only run with the nonce of the request; what the page
      // is refused under it lands in the console errors checked below.
      expect(policyDefect(response?.headers() ?? {}), "politique de sécurité du contenu").toBeNull()
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

// Screens that only show once something is clicked: nothing of them may log an error, or be
// refused under the Content-Security-Policy.
test("les onglets des finances, l'export et le détail d'un incident s'ouvrent sans erreur", async ({ page, baseURL }) => {
  const errors = watchConsole(page, baseURL)
  const main = page.getByRole("main")

  await page.goto("/administration/finance")
  await expect(main.getByRole("heading", { level: 1, name: "Finances" })).toBeVisible()
  for (const tab of ["Dépenses", "Coûts par avion", "Prévisions", "Synthèse"]) {
    await main.getByRole("tab", { name: tab, exact: true }).click()
    const panel = main.getByRole("tabpanel", { name: tab })
    await expect(panel).toBeVisible()
    await expect(panel.locator(".animate-pulse")).toHaveCount(0)
    await expect(panel).not.toBeEmpty()
    for (const title of ERROR_SCREENS) await expect(page.getByText(title, { exact: true })).toHaveCount(0)
    expect(rawTranslationKeys(await panel.innerText()), `clés de traduction dans l'onglet ${tab}`).toEqual([])
  }
  await main.getByRole("button", { name: "Exporter", exact: true }).click()
  const exportDialog = page.getByRole("dialog", { name: "Exporter le rapport financier" })
  await expect(exportDialog.getByRole("combobox", { name: "Format" })).toBeVisible()
  await exportDialog.getByRole("button", { name: "Annuler" }).click()
  await expect(exportDialog).toBeHidden()

  await page.goto("/administration/incidents")
  await expect(main.getByRole("heading", { level: 1, name: "Incidents" })).toBeVisible()
  // The demo data set holds incidents; the first of the list opens its panel.
  await main.getByRole("row", { name: /^Incident du .* : voir le détail$/ }).first().click()
  const incident = page.getByRole("dialog", { name: /^Incident du / })
  await expect(incident.getByRole("heading", { name: "Description" })).toBeVisible()
  await expect(incident.getByRole("heading", { name: "Suivi" })).toBeVisible()
  expect(rawTranslationKeys(await incident.innerText()), "clés de traduction dans le détail de l'incident").toEqual([])
  await incident.getByRole("button", { name: "Fermer" }).first().click()
  await expect(incident).toBeHidden()

  await page.waitForLoadState("networkidle")
  expect(errors, "erreurs dans la console").toEqual([])
})

// An API without a key for the weather provider answers "nothing found": the card says so
// quietly instead of showing a failed load (the suite answers in the API's place, see support/weather.ts).
test("le tableau de bord reste discret quand le club n'a pas de fournisseur météo", async ({ page, baseURL }) => {
  const errors = watchConsole(page, baseURL)
  await stubWeather(page, { available: false })

  await page.goto("/dashboard")
  const main = page.getByRole("main")
  await expect(main.getByText("Météo indisponible")).toBeVisible()
  await expect(main.locator(".animate-pulse")).toHaveCount(0)
  await page.waitForLoadState("networkidle")

  await expect(page.getByText("Chargement impossible", { exact: true })).toHaveCount(0)
  expect(errors, "erreurs dans la console").toEqual([])
})

// The browser asks for these from the sign-in page, a search engine or the home screen of a
// phone: they are served to everyone, where they used to be answered by the "not connected" page.
test.describe("Fichiers publics, sans session", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  const PUBLIC_DIR = path.join(__dirname, "..", "public")
  const filesUnder = (dir: string, prefix = ""): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? filesUnder(path.join(dir, entry.name), `${prefix}/${entry.name}`) : [`${prefix}/${entry.name}`],
    )
  const TYPES: Record<string, RegExp> = {
    ".json": /json/,
    ".js": /javascript/,
    ".png": /image\/png/,
    ".svg": /image\/svg/,
    ".ico": /image\//,
  }

  test("chaque fichier du dossier public et l'icône du site sont servis", async ({ request }) => {
    // The offline worker only exists in a production build: a development server has none to serve.
    const files = [...filesUnder(PUBLIC_DIR).filter((file) => !/^\/(sw|swe-worker-[\w-]+)\.js$|\.DS_Store$/.test(file)), "/favicon.ico"]
    expect(files).toEqual(expect.arrayContaining(["/manifest.json", "/images/icon-192.png"]))

    for (const file of files) {
      const response = await request.get(file, { maxRedirects: 0 })
      expect(response.status(), file).toBe(200)
      expect(response.headers()["content-type"], file).toMatch(TYPES[path.extname(file)])
    }
  })

  test("les pages, elles, demandent toujours une session", async ({ request }) => {
    for (const page of ["/dashboard", "/administration/users", "/images/members", "/dashboard/manifest.json"]) {
      const response = await request.get(page, { maxRedirects: 0 })
      expect(response.status(), page).toBe(307)
      expect(response.headers()["location"], page).toMatch(/\/system\/notconnected$/)
    }
  })
})
