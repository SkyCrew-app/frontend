import { test, expect, sidePanel, toast, choose, asRole, confirmAlert } from "./support/test"
import { sessionFile } from "./support/accounts"

test.use({ storageState: sessionFile("pilot") })

// The permanent test aircraft: a low severity leaves it bookable for the other journeys.
const AIRCRAFT = "F-EEEE"

test("le pilote signale un incident en dehors d'un vol, le club le suit", async ({ page, browser }) => {
  const stamp = `E2E incident ${Date.now()}`
  const description = `${stamp} : feu anticollision qui clignote mal`

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
    await page.getByRole("textbox", { name: "Rechercher des incidents" }).fill(stamp)
    const row = page.getByRole("row").filter({ hasText: AIRCRAFT })
    await expect(row.first()).toContainText("Ouvert")
  })

  // The staff follows it up: resolved, it no longer counts among the open incidents.
  await test.step("l'administrateur le résout", async () => {
    await asRole(browser, "admin", async (admin) => {
      await admin.goto("/administration/incidents")
      await admin.getByRole("textbox", { name: "Rechercher des incidents" }).fill(stamp)
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

// The author withdraws a report nobody has taken up; the detail offers it only then.
test("le pilote supprime son propre signalement tant que personne ne l'a pris en charge", async ({ page }) => {
  // The whole stamp, down to the millisecond: the incident of the journey above, kept, is
  // reported seconds earlier and would share a shorter prefix.
  const stamp = `E2E incident ${Date.now()}`
  const description = `${stamp} : signalé par erreur`

  await test.step("il signale l'incident", async () => {
    await page.goto("/fleet/incidents")
    await page.getByRole("button", { name: "Signaler un incident" }).click()
    const report = sidePanel(page, "Signaler un incident")
    await choose(page, report.getByRole("combobox", { name: /Avion/ }), new RegExp(`^${AIRCRAFT}`))
    await report.getByRole("radio", { name: "Faible" }).click()
    await report.getByRole("textbox", { name: /Description/ }).fill(description)
    await report.getByRole("button", { name: "Signaler l'incident" }).click()
    await expect(toast(page, "Incident signalé")).toBeVisible()
    await expect(report).toBeHidden()
  })

  await test.step("le détail lui propose de le supprimer, après confirmation", async () => {
    await page.getByRole("textbox", { name: "Rechercher des incidents" }).fill(stamp)
    await page.getByRole("row").filter({ hasText: AIRCRAFT }).first().click()
    const detail = page.getByRole("dialog", { name: /^Incident du / })
    await expect(detail).toContainText(description)
    await expect(detail).toContainText("personne ne l'a encore pris en charge")
    await detail.getByRole("button", { name: "Supprimer mon signalement" }).click()
    await expect(page.getByRole("alertdialog")).toContainText("Supprimer votre signalement ?")
    await confirmAlert(page, "Supprimer mon signalement")
    await expect(toast(page, "Signalement supprimé")).toBeVisible()
    await expect(detail).toBeHidden()
    await expect(page.getByRole("row").filter({ hasText: stamp })).toHaveCount(0)
  })
})

test("le détail d'un incident signalé par un autre membre ne propose pas de le supprimer", async ({ page }) => {
  await page.goto("/fleet/incidents")
  // The demo incidents are reported by other members than the pilot.
  const row = page.getByRole("row").filter({ hasNotText: "Jean Dupont" }).nth(1)
  await row.click()
  const detail = page.getByRole("dialog", { name: /^Incident du / })
  await expect(detail).toBeVisible()
  await expect(detail.getByRole("button", { name: "Supprimer mon signalement" })).toHaveCount(0)
})
