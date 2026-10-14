import fs from "node:fs"
import type { Download } from "@playwright/test"
import { test, expect, toast } from "./support/test"
import { sessionFile } from "./support/accounts"

test.use({ storageState: sessionFile("pilot") })

// The API returns each document encoded in the answer; the page turns it into a file the
// browser saves. Nothing of it may be refused under the Content-Security-Policy (every journey
// checks that, see support/test.ts) and the file must really be a PDF.
async function expectPdf(download: Download, name: RegExp) {
  expect(download.suggestedFilename()).toMatch(name)
  const file = await download.path()
  const content = fs.readFileSync(file)
  expect(content.subarray(0, 5).toString()).toBe("%PDF-")
  expect(content.length).toBeGreaterThan(500)
}

test("le pilote télécharge une de ses factures", async ({ page }) => {
  await page.goto("/profile/money_account")
  await expect(page.getByRole("heading", { level: 1, name: "Mon compte" })).toBeVisible()
  await expect(page.getByText("Mes factures")).toBeVisible()

  // The demo data set gives the pilot paid bookings, each with its invoice.
  const first = page.getByRole("button", { name: /^Télécharger la facture / }).first()
  await expect(first).toBeVisible()
  const number = (await first.getAttribute("aria-label"))!.replace("Télécharger la facture ", "")
  // A booking's invoice names the flight when it is known ("Vol en F-EEEE du …"), else "Réservation".
  await expect(page.getByRole("row").filter({ hasText: number }).first()).toContainText(/Vol en F-|Réservation/)

  const [download] = await Promise.all([page.waitForEvent("download"), first.click()])
  await expectPdf(download, new RegExp(`^facture-.*${number}.*\\.pdf$`))
  await expect(page.getByText("La facture n'a pas pu être téléchargée")).toHaveCount(0)
  await expect(first).toBeEnabled()
})

test("le pilote exporte son carnet de vol en PDF", async ({ page }) => {
  await page.goto("/logbook")
  await expect(page.getByRole("heading", { level: 1, name: "Carnet de vol" })).toBeVisible()
  // The role of the member on each flight is a column of the logbook.
  await expect(page.getByRole("columnheader", { name: "Fonction" })).toBeVisible()
  await expect(page.getByRole("cell", { name: "Commandant de bord" }).first()).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exporter en PDF" }).click(),
  ])
  await expectPdf(download, /^carnet-de-vol\.pdf$/)
  await expect(toast(page, "Carnet de vol exporté")).toBeVisible()
})
