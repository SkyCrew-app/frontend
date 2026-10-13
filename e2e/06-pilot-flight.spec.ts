import type { Page } from "@playwright/test"
import { test, expect, sidePanel, toast, confirmAlert, choose, asRole, uniqueName } from "./support/test"
import { sessionFile } from "./support/accounts"
import { ensureAircraft, type TestAircraft } from "./support/aircraft"
import { stubAirportSearch } from "./support/airports"
import { openCalendarAhead } from "./support/calendar"

test.use({ storageState: sessionFile("pilot") })

// Both journeys book an aircraft kept for the tests: at one cent an hour the pilot's balance
// barely moves. It is never deleted, because a closed flight keeps its booking, and an
// aircraft with bookings cannot be removed.
const HOURLY_COST = 0.01
const aircraft: TestAircraft = { registration: "F-EEEE", model: "E2E avion des tests" }

test.beforeAll(async ({ browser }) => {
  await asRole(browser, "admin", (page) => ensureAircraft(page, aircraft, String(HOURLY_COST)))
})

// What a journey still holds on the calendar if it stops before cancelling.
let booked: { purpose: string; day: string } | null = null

async function cancelBooking(page: Page, purpose: string, day: string) {
  await openCalendarAhead(page, day)
  await page.getByRole("button", { name: new RegExp(`^${purpose}`) }).click()
  await sidePanel(page, "Détails de la réservation").getByRole("button", { name: "Supprimer" }).click()
  await expect(page.getByRole("alertdialog")).toContainText(`La réservation de ${aircraft.registration}`)
  await confirmAlert(page, "Supprimer la réservation")
  await expect(toast(page, "Réservation supprimée")).toBeVisible()
  await expect(page.getByRole("cell", { name: `Réserver ${aircraft.registration} à 08:00` })).toBeVisible()
  booked = null
}

/** Books the 08:00 slot of the test aircraft by clicking its free cell. */
async function bookSlot(page: Page, purpose: string) {
  const dayLabel = await openCalendarAhead(page)
  const day = dayLabel.match(/\d+/)![0]

  await page.getByRole("cell", { name: `Réserver ${aircraft.registration} à 08:00` }).click()
  const panel = sidePanel(page, "Créer une réservation")
  await expect(panel).toContainText(aircraft.registration)
  await expect(panel).toContainText(dayLabel)
  await expect(panel).toContainText("08:00")
  await expect(panel).toContainText("09:00")
  await panel.getByLabel("But de la réservation").fill(purpose)
  await choose(page, panel.getByRole("combobox", { name: "Catégorie de vol" }), "Local")
  await panel.getByRole("button", { name: "Créer la réservation" }).click()
  booked = { purpose, day }

  await expect(toast(page, "Réservation créée")).toBeVisible()
  await expect(panel).toBeHidden()
  return { day, dayLabel }
}

/** Balance shown in the top bar, in euros. */
async function balance(page: Page) {
  await page.goto("/reservations/my")
  const account = page.getByRole("banner").getByRole("button", { name: /^Menu du compte de Jean Dupont/ })
  await expect(account).toContainText("€")
  const amount = (await account.innerText()).match(/(\d[\d\s  ]*,\d{2})\s*€/)![1]
  return Number(amount.replace(/[\s  ]/g, "").replace(",", "."))
}

test.afterEach(async ({ page }) => {
  if (booked) await cancelBooking(page, booked.purpose, booked.day)
})


// Flights cannot be deleted from the application: each run leaves one closed flight in the pilot's
// logbook, and its booking on the calendar.
test("le pilote réserve un créneau, génère le plan de vol, clôture le vol et le retrouve dans son carnet", async ({
  page,
  context,
}) => {
  await stubAirportSearch(context)
  const purpose = uniqueName("E2E vol")
  const remark = `Remarque ${purpose}`

  const { day, dayLabel } = await test.step("réservation sur le calendrier", () => bookSlot(page, purpose))

  await test.step("la réservation est visible", async () => {
    const slot = page.getByRole("button", { name: new RegExp(`^${purpose}`) })
    await expect(slot).toBeVisible()
    await slot.click()
    const detail = sidePanel(page, "Détails de la réservation")
    await expect(detail.getByRole("heading", { name: purpose })).toBeVisible()
    await expect(detail).toContainText("Confirmée")
    await expect(detail).toContainText(dayLabel)
    await expect(detail).toContainText("08:00 – 09:00")
    await detail.getByRole("button", { name: "Fermer" }).click()

    await page.goto("/reservations/my")
    await page.getByRole("searchbox", { name: "Rechercher une réservation" }).fill(purpose)
    const list = page.getByRole("tabpanel", { name: "Réservations" })
    await expect(list.getByText(purpose)).toBeVisible()
    await expect(list.getByText(aircraft.registration)).toBeVisible()
    // The search leaves this one reservation: its link is the only one.
    await list.getByRole("link", { name: "Créer un plan de vol" }).click()
  })

  await test.step("génération du plan de vol LFPG → LFPO", async () => {
    await expect(page.getByRole("heading", { level: 1, name: "Créer un plan de vol" })).toBeVisible()
    await expect(page.getByText(`Pour la réservation de ${aircraft.registration}`)).toBeVisible()
    const auto = page.getByRole("tabpanel", { name: "Génération automatique" })

    await auto.getByRole("combobox", { name: "Aérodrome de départ" }).click()
    await page.getByPlaceholder(/./).last().fill("LFPG")
    await page.getByRole("option", { name: /LFPG/ }).click()
    await auto.getByRole("combobox", { name: "Aérodrome d'arrivée" }).click()
    await page.getByPlaceholder(/./).last().fill("LFPO")
    await page.getByRole("option", { name: /LFPO/ }).click()
    await expect(auto.getByRole("combobox", { name: "Aérodrome de départ" })).toContainText("LFPG")
    await expect(auto.getByRole("combobox", { name: "Aérodrome d'arrivée" })).toContainText("LFPO")

    await auto.getByRole("button", { name: "Générer le plan de vol" }).click()
    await expect(page).toHaveURL(/\/reservations\/flight-plans\/\d+$/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText("LFPG → LFPO")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Prévu")
    await expect(page.getByRole("main")).toContainText(`${aircraft.registration} · ${aircraft.model}`)
    await expect(page.getByRole("tab", { name: "Navigation" })).toBeVisible()
  })

  const flightUrl = page.url()

  // Known issue, reported but not blocking: the logbook ("Vos vols clôturés") already lists
  // the flight although it has not been closed. Noted in the report when it is still the case.
  await test.step("carnet de vol avant la clôture", async () => {
    await page.goto("/logbook")
    await expect(page.getByRole("heading", { level: 1, name: "Carnet de vol" })).toBeVisible()
    await expect(page.getByRole("table").getByRole("row").nth(1)).toBeVisible()
    if ((await page.getByRole("row").filter({ hasText: aircraft.registration }).count()) > 0) {
      test.info().annotations.push({
        type: "issue",
        description: "Le carnet de vol liste un vol qui n'est pas encore clôturé.",
      })
    }
    await page.goto(flightUrl)
  })

  await test.step("clôture du vol en trois étapes", async () => {
    await page.getByRole("link", { name: "Clôturer le vol" }).click()
    await expect(page).toHaveURL(/\/close_flight\/\d+$/)
    await expect(page.getByRole("heading", { level: 1, name: "Clôturer le vol" })).toBeVisible()

    const flown = page.getByRole("group", { name: "Vol réalisé" })
    await expect(flown.getByLabel("Aérodrome de départ (OACI)")).toHaveValue("LFPG")
    await expect(flown.getByLabel("Aérodrome d'arrivée (OACI)")).toHaveValue("LFPO")
    await flown.getByRole("spinbutton", { name: "Heures de vol" }).fill("0")
    await flown.getByRole("spinbutton", { name: "Minutes de vol" }).fill("25")
    await choose(page, flown.getByRole("combobox", { name: "Type de vol" }), "VFR")
    await page.getByRole("button", { name: "Suivant" }).click()

    const incident = page.getByRole("group", { name: "Incident" })
    await expect(incident.getByRole("switch", { name: "Un incident est survenu pendant ce vol" })).not.toBeChecked()
    await page.getByRole("button", { name: "Suivant" }).click()

    await page.getByRole("group", { name: "Remarques" }).getByLabel("Remarques sur le vol").fill(remark)
    await page.getByRole("button", { name: "Clôturer le vol" }).click()
    await expect(page.getByRole("alertdialog")).toContainText("LFPG → LFPO sera inscrit dans votre carnet avec 25 min de vol")
    await confirmAlert(page, "Clôturer le vol")

    await expect(page.getByText("Vol clôturé")).toBeVisible()
    await expect(page.getByRole("main")).toContainText("25 min")
  })

  await test.step("le vol est dans le carnet de vol", async () => {
    await page.getByRole("button", { name: "Voir le carnet de vol" }).click()
    await expect(page).toHaveURL(/\/logbook$/)
    // The remark and the corrected duration only exist once the flight is closed.
    const row = page.getByRole("row").filter({ hasText: remark })
    await expect(row).toBeVisible()
    await expect(row).toContainText(aircraft.registration)
    await expect(row).toContainText("LFPG")
    await expect(row).toContainText("LFPO")
    await expect(row).toContainText("25 min")
    await expect(row).toContainText("VFR")

    await page.goto(flightUrl)
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Clôturé")
    await expect(page.getByRole("link", { name: "Clôturer le vol" })).toHaveCount(0)
  })

  await test.step("la réservation d'un vol clôturé ne peut plus être annulée", async () => {
    await openCalendarAhead(page, day)
    await page.getByRole("button", { name: new RegExp(`^${purpose}`) }).click()
    const detail = sidePanel(page, "Détails de la réservation")
    await expect(detail.getByRole("heading", { name: purpose })).toBeVisible()
    await expect(detail.getByRole("button", { name: "Supprimer" })).toHaveCount(0)
    await expect(detail.getByRole("button", { name: "Modifier" })).toHaveCount(0)
    // Nothing left to cancel for the cleanup.
    booked = null
  })
})

// Guards a past defect: cancelling used to debit the price a second time instead of refunding it.
test("annuler une réservation recrédite le solde du pilote", async ({ page }) => {
  const purpose = uniqueName("E2E remboursement")

  const before = await balance(page)
  const { day } = await bookSlot(page, purpose)
  await expect.poll(() => balance(page)).toBeCloseTo(before - HOURLY_COST, 2)

  await cancelBooking(page, purpose, day)
  await expect.poll(() => balance(page), { timeout: 10_000 }).toBeCloseTo(before, 2)
})
