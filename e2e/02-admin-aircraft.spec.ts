import { test, expect, sidePanel, toast } from "./support/test"
import { sessionFile } from "./support/accounts"
import { aircraftCard, createAircraft, deleteAircraft, newAircraft } from "./support/aircraft"

test.use({ storageState: sessionFile("admin") })

// Registration still in the fleet if the journey stops before its own deletion.
let leftover: string | null = null

test.afterEach(async ({ page }) => {
  if (!leftover) return
  const registration = leftover
  leftover = null
  await deleteAircraft(page, registration)
})

test("l'administrateur crée un aéronef en trois étapes, le modifie puis le supprime", async ({ page }) => {
  const aircraft = newAircraft()
  const card = aircraftCard(page, aircraft.registration)

  await test.step("création", async () => {
    leftover = aircraft.registration
    await createAircraft(page, aircraft, "123")
    await expect(card).toContainText(aircraft.model)
    await expect(card).toContainText("123,00 €")
    await expect(card).toContainText("Disponible")
  })

  await test.step("modification", async () => {
    await card.getByRole("button", { name: "Modifier" }).click()
    const panel = sidePanel(page, `Modifier ${aircraft.registration}`)
    await expect(panel.getByLabel("Immatriculation")).toHaveValue(aircraft.registration)
    await panel.getByLabel("Coût horaire").fill("135")
    await panel.getByRole("button", { name: "Suivant" }).click()
    await expect(panel.getByLabel("Vitesse de croisière")).toHaveValue("110")
    await panel.getByRole("button", { name: "Suivant" }).click()
    await panel.getByRole("button", { name: "Enregistrer" }).click()

    await expect(toast(page, "Aéronef mis à jour")).toBeVisible()
    await expect(panel).toBeHidden()
    await expect(card).toContainText("135,00 €")
  })

  await test.step("suppression", async () => {
    expect(await deleteAircraft(page, aircraft.registration)).toBe(true)
    await expect(card).toHaveCount(0)
    leftover = null
  })
})
