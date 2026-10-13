import type { Page } from "@playwright/test"
import { expect, sidePanel, toast, confirmAlert } from "./test"

export interface TestAircraft {
  registration: string
  model: string
}

/** Registrations are unique: derived from the clock so a rerun never reuses one. */
export const newAircraft = (): TestAircraft => {
  const stamp = Date.now()
  return { registration: `F-E${stamp.toString(36).slice(-4).toUpperCase()}`, model: `E2E ${stamp}` }
}

export const aircraftCard = (page: Page, registration: string) =>
  page.locator("[data-aircraft-card]").filter({ has: page.getByRole("heading", { name: registration }) })

/** Creates an aircraft through the three steps of the side panel (administrator). */
export async function createAircraft(page: Page, aircraft: TestAircraft, hourlyCost: string) {
  await page.goto("/administration/planes")
  await page.getByRole("button", { name: "Ajouter un aéronef" }).click()
  const panel = sidePanel(page, "Ajouter un aéronef")

  await panel.getByLabel("Immatriculation").fill(aircraft.registration)
  await panel.getByLabel("Modèle").fill(aircraft.model)
  await panel.getByLabel("Année de fabrication").fill("2020")
  await panel.getByLabel("Coût horaire").fill(hourlyCost)
  await panel.getByRole("button", { name: "Suivant" }).click()

  // Cruise speed and ceiling are what the flight plan generator needs.
  await expect(panel.getByRole("heading", { name: "Performances" })).toBeVisible()
  await panel.getByLabel("Altitude maximale").fill("12000")
  await panel.getByLabel("Vitesse de croisière").fill("110")
  await panel.getByLabel("Consommation").fill("30")
  await panel.getByLabel("Type de carburant").fill("100LL")
  await panel.getByRole("button", { name: "Suivant" }).click()

  await expect(panel.getByRole("button", { name: "Choisir une photo" })).toBeVisible()
  await panel.getByRole("button", { name: "Ajouter l'aéronef" }).click()

  await expect(toast(page, "Aéronef ajouté")).toBeVisible()
  await expect(panel).toBeHidden()
  await expect(aircraftCard(page, aircraft.registration)).toBeVisible()
}

/** Deletes the aircraft if it is still in the fleet. Returns false when it was already gone. */
export async function deleteAircraft(page: Page, registration: string) {
  await page.goto("/administration/planes")
  await expect(page.locator("[data-aircraft-card]").first()).toBeVisible()
  const remove = page.getByRole("button", { name: `Supprimer ${registration}` })
  if ((await remove.count()) === 0) return false
  await remove.click()
  await expect(page.getByRole("alertdialog")).toContainText(`Supprimer ${registration} ?`)
  await confirmAlert(page, "Supprimer")
  await expect(toast(page, "Aéronef supprimé")).toBeVisible()
  await expect(remove).toHaveCount(0)
  return true
}
