import { test, expect, sidePanel, toast, choose, asRole } from "./support/test"
import { sessionFile } from "./support/accounts"

test.use({ storageState: sessionFile("pilot") })

// The permanent test aircraft: a low severity leaves it bookable for the other journeys.
const AIRCRAFT = "F-EEEE"

test("le pilote signale un incident en dehors d'un vol, le club le suit", async ({ page, browser }) => {
  const description = `E2E incident ${Date.now()} : feu anticollision qui clignote mal`

  await test.step("depuis la fiche de l'avion, l'avion est déjà choisi", async () => {
    await page.goto("/fleet")
    await page.getByRole("row").filter({ hasText: AIRCRAFT }).first().click()
    const detail = sidePanel(page, AIRCRAFT)
    await detail.getByRole("button", { name: "Signaler un incident" }).click()
    const report = sidePanel(page, "Signaler un incident")
    await expect(report.getByRole("combobox", { name: /Avion/ })).toContainText(AIRCRAFT)
    await expect(report.getByRole("combobox", { name: /Avion/ })).toBeDisabled()
    await report.getByRole("button", { name: "Annuler" }).click()
    await expect(report).toBeHidden()
  })

  await test.step("depuis la page des incidents", async () => {
    await page.goto("/fleet/incidents")
    await page.getByRole("button", { name: "Signaler un incident" }).click()
    const report = sidePanel(page, "Signaler un incident")
    await expect(report).toContainText("Une gravité élevée immobilise l'avion")

    // Nothing is sent without the aircraft, the severity and a description.
    await report.getByRole("button", { name: "Signaler l'incident" }).click()
    await expect(report).toContainText("Choisissez l'avion concerné.")

    await choose(page, report.getByRole("combobox", { name: /Avion/ }), new RegExp(`^${AIRCRAFT}`))
    await report.getByRole("radio", { name: "Faible" }).click()
    await report.getByRole("textbox", { name: /Description/ }).fill(description)
    await report.getByRole("button", { name: "Signaler l'incident" }).click()

    await expect(toast(page, "Incident signalé")).toBeVisible()
    await expect(report).toBeHidden()
    await page.getByRole("textbox", { name: "Rechercher des incidents" }).fill(description.slice(0, 22))
    const row = page.getByRole("row").filter({ hasText: AIRCRAFT })
    await expect(row.first()).toContainText("Ouvert")
  })

  // The staff follows it up: resolved, it no longer counts among the open incidents.
  await test.step("l'administrateur le résout", async () => {
    await asRole(browser, "admin", async (admin) => {
      await admin.goto("/administration/incidents")
      await admin.getByRole("textbox", { name: "Rechercher des incidents" }).fill(description.slice(0, 22))
      await admin.getByRole("row").filter({ hasText: AIRCRAFT }).first().click()
      const detail = admin.getByRole("dialog", { name: /^Incident du / })
      await expect(detail).toContainText(description)
      await detail.getByRole("button", { name: "Marquer comme résolu" }).click()
      const confirm = admin.getByRole("alertdialog")
      await confirm.getByLabel("Note de résolution").fill("Ampoule changée (E2E).")
      await confirm.getByRole("button", { name: "Marquer comme résolu" }).click()
      await expect(confirm).toBeHidden()
      // The detail stays open and shows the follow-up.
      await expect(detail).toContainText("Ampoule changée (E2E).")
      await expect(detail.getByRole("button", { name: "Rouvrir" })).toBeVisible()
    })
  })
})
