import type { Page } from "@playwright/test"
import { test, expect, sidePanel, toast, confirmAlert, choose, asRole, uniqueName } from "./support/test"
import { sessionFile } from "./support/accounts"
import { ensureAircraft, type TestAircraft } from "./support/aircraft"
import { stubAirportSearch } from "./support/airports"
import { openCalendarAhead } from "./support/calendar"
import { moveBookingIntoThePast } from "./support/database"

test.use({ storageState: sessionFile("pilot") })

// Both journeys book an aircraft kept for the tests: at one cent an hour the pilot's balance
// barely moves. It is never deleted: an aircraft with a history is retired by the API, not removed.
const HOURLY_COST = 0.01
const aircraft: TestAircraft = { registration: "F-EEEE", model: "E2E avion des tests" }

test.beforeAll(async ({ browser }) => {
  await asRole(browser, "admin", (page) => ensureAircraft(page, aircraft, String(HOURLY_COST)))
})

// What a journey still holds on the calendar if it stops before cancelling.
let booked: { purpose: string; day: string; hour: string } | null = null

async function cancelBooking(page: Page, purpose: string, day: string, hour = "08:00") {
  await openCalendarAhead(page, day)
  await page.getByRole("button", { name: new RegExp(`^${purpose}`) }).click()
  await sidePanel(page, "Détails de la réservation").getByRole("button", { name: "Supprimer" }).click()
  await expect(page.getByRole("alertdialog")).toContainText(`La réservation de ${aircraft.registration}`)
  await confirmAlert(page, "Supprimer la réservation")
  await expect(toast(page, "Réservation supprimée")).toBeVisible()
  await expect(page.getByRole("cell", { name: `Réserver ${aircraft.registration} à ${hour}` })).toBeVisible()
  booked = null
}

/** Books a one-hour slot of the test aircraft by clicking its free cell. */
async function bookSlot(page: Page, purpose: string, hour = "08:00") {
  const end = `${String(Number(hour.slice(0, 2)) + 1).padStart(2, "0")}:00`
  const dayLabel = await openCalendarAhead(page)
  const day = dayLabel.match(/\d+/)![0]

  await page.getByRole("cell", { name: `Réserver ${aircraft.registration} à ${hour}` }).click()
  const panel = sidePanel(page, "Créer une réservation")
  await expect(panel).toContainText(aircraft.registration)
  await expect(panel).toContainText(dayLabel)
  await expect(panel).toContainText(hour)
  await expect(panel).toContainText(end)
  await panel.getByLabel("But de la réservation").fill(purpose)
  await choose(page, panel.getByRole("combobox", { name: "Catégorie de vol" }), "Local")
  await panel.getByRole("button", { name: "Créer la réservation" }).click()
  booked = { purpose, day, hour }

  await expect(toast(page, "Réservation créée")).toBeVisible()
  await expect(panel).toBeHidden()
  return { day, dayLabel }
}

/** From the pilot's reservations, opens the booking's flight plan form and generates LFPG → LFPO. */
async function generateFlightPlan(page: Page, purpose: string) {
  await page.goto("/reservations/my")
  await page.getByRole("searchbox", { name: "Rechercher une réservation" }).fill(purpose)
  const list = page.getByRole("tabpanel", { name: "Réservations" })
  await expect(list.getByText(purpose)).toBeVisible()
  await expect(list.getByText(aircraft.registration)).toBeVisible()
  // The search leaves this one reservation: its link is the only one.
  await list.getByRole("link", { name: "Créer un plan de vol" }).click()

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
  if (booked) await cancelBooking(page, booked.purpose, booked.day, booked.hour)
})


// The API closes a flight only once its booking has started. The slot booked here is months
// ahead, so the journey stops where the member is told to wait; the booking is cancelled by the
// cleanup. (Before this rule the journey closed the flight straight away, months before the slot.)
test("le pilote réserve un créneau, génère le plan de vol et ne peut pas clôturer le vol avant le début du créneau", async ({
  page,
  context,
}) => {
  await stubAirportSearch(context)
  const purpose = uniqueName("E2E vol")

  const { dayLabel } = await test.step("réservation sur le calendrier", () => bookSlot(page, purpose))

  await test.step("la réservation est visible", async () => {
    const slot = page.getByRole("button", { name: new RegExp(`^${purpose}`) })
    await expect(slot).toBeVisible()
    await slot.click()
    const detail = sidePanel(page, "Détails de la réservation")
    await expect(detail.getByRole("heading", { name: purpose })).toBeVisible()
    await expect(detail).toContainText("Confirmée")
    await expect(detail).toContainText(dayLabel)
    await expect(detail).toContainText("08:00 – 09:00")
    // The price shown is the one the API stored when it charged the booking: one hour at one cent.
    await expect(detail).toContainText("Prix payé")
    await expect(detail).toContainText(/0,01\s€/)
    await detail.getByRole("button", { name: "Fermer" }).click()
  })

  await test.step("génération du plan de vol LFPG → LFPO", () => generateFlightPlan(page, purpose))

  const flightUrl = page.url()
  const flightId = flightUrl.match(/(\d+)$/)![1]

  await test.step("la clôture n'est pas proposée avant le début de la réservation", async () => {
    await expect(page.getByRole("link", { name: "Clôturer le vol" })).toHaveCount(0)

    await page.goto("/reservations/flight-plans")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByText(/Clôture possible à partir du/).first()).toBeVisible()
  })

  await test.step("la page de clôture explique pourquoi et ne montre pas le formulaire", async () => {
    await page.goto(`/close_flight/${flightId}`)
    await expect(page.getByRole("heading", { level: 1, name: "Clôturer le vol" })).toBeVisible()
    await expect(page.getByText("Ce vol ne peut pas encore être clôturé")).toBeVisible()
    await expect(page.getByText(/Sa réservation commence le/)).toBeVisible()
    await expect(page.getByRole("group", { name: "Vol réalisé" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Clôturer le vol" })).toHaveCount(0)
  })
})

// Closing needs a booking that has started, and a member can only book ahead. The journey books
// and plans the flight like any member, then a test-only database fixture (support/database.ts)
// moves that booking into the past: the API keeps its rule and gets no way around it.
test("le pilote clôture un vol dont la réservation a commencé et le retrouve dans son carnet", async ({
  page,
  context,
}) => {
  await stubAirportSearch(context)
  const purpose = uniqueName("E2E vol clos")
  const remark = uniqueName("Remarque E2E vol")

  await test.step("réservation et plan de vol", async () => {
    await bookSlot(page, purpose)
    await generateFlightPlan(page, purpose)
  })
  const flightPlanUrl = page.url()

  await test.step("la réservation a commencé", async () => {
    moveBookingIntoThePast(purpose)
    // It left the day it was booked on, and a flown booking is no longer cancelled: nothing to clean up.
    booked = null
  })

  await test.step("la clôture est maintenant proposée", async () => {
    await page.goto(flightPlanUrl)
    await expect(page.getByRole("heading", { level: 1 })).toContainText("LFPG → LFPO")
    await page.getByRole("link", { name: "Clôturer le vol" }).click()
    await expect(page).toHaveURL(/\/close_flight\/\d+$/)
    await expect(page.getByRole("heading", { level: 1, name: "Clôturer le vol" })).toBeVisible()
  })

  await test.step("clôture du vol en trois étapes", async () => {
    const flown = page.getByRole("group", { name: "Vol réalisé" })
    // The API refuses an empty flight time: so does the form.
    await flown.getByRole("spinbutton", { name: "Heures de vol" }).fill("0")
    await flown.getByRole("spinbutton", { name: "Minutes de vol" }).fill("0")
    await page.getByRole("button", { name: "Suivant" }).click()
    await expect(flown.getByText("Indiquez un temps de vol supérieur à zéro")).toBeVisible()

    await flown.getByRole("spinbutton", { name: "Minutes de vol" }).fill("25")
    await choose(page, flown.getByRole("combobox", { name: "Type de vol" }), "VFR")
    await page.getByRole("button", { name: "Suivant" }).click()

    const incident = page.getByRole("group", { name: "Incident" })
    await expect(incident.getByRole("switch", { name: "Un incident est survenu pendant ce vol" })).not.toBeChecked()
    await page.getByRole("button", { name: "Suivant" }).click()

    await page.getByRole("group", { name: "Remarques" }).getByLabel("Remarques sur le vol").fill(remark)
    await page.getByRole("button", { name: "Clôturer le vol" }).click()
    await expect(page.getByRole("alertdialog")).toContainText("sera inscrit dans votre carnet avec 25 min de vol")
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
    await expect(row).toContainText("25 min")
    await expect(row).toContainText("VFR")
  })
})

// Guards a past defect: cancelling used to debit the price a second time instead of refunding it.
// The refund is the amount stored on the booking when it was charged, given back once.
test("annuler une réservation recrédite le solde du pilote", async ({ page }) => {
  const purpose = uniqueName("E2E remboursement")

  const before = await balance(page)
  // Its own hour: the other journey holds the 08:00 slot of the day until its cleanup.
  const { day } = await bookSlot(page, purpose, "10:00")
  await expect.poll(() => balance(page)).toBeCloseTo(before - HOURLY_COST, 2)

  await cancelBooking(page, purpose, day, "10:00")
  await expect.poll(() => balance(page), { timeout: 10_000 }).toBeCloseTo(before, 2)
})
