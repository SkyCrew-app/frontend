import type { Page } from "@playwright/test"
import { test, expect, sidePanel, toast, confirmAlert, asRole, uniqueName } from "./support/test"
import { ACCOUNTS, sessionFile } from "./support/accounts"
import { ensureAircraft, type TestAircraft } from "./support/aircraft"
import { openCalendarAhead } from "./support/calendar"

const STUDENT = ACCOUNTS.student
const INSTRUCTOR = ACCOUNTS.instructor.name

test.use({ storageState: sessionFile("student") })

// The aircraft kept for the tests (see 06-pilot-flight): at one cent an hour the student's balance
// barely moves. Its own hour of the day, away from the slots the pilot journeys book.
const aircraft: TestAircraft = { registration: "F-EEEE", model: "E2E avion des tests" }
const HOUR = "14:00"
const END = "15:00"

test.beforeAll(async ({ browser }) => {
  await asRole(browser, "admin", (page) => ensureAircraft(page, aircraft, "0.01"))
})

const freeCell = (page: Page) => page.getByRole("cell", { name: `Réserver ${aircraft.registration} à ${HOUR}` })

// What the journey still holds on the calendar if it stops before the instructor declines.
let booked: { purpose: string; day: string } | null = null

test.afterEach(async ({ page }) => {
  if (!booked) return
  // The student cancels her own booking.
  await openCalendarAhead(page, booked.day)
  await page.getByRole("button", { name: new RegExp(`^${booked.purpose}`) }).click()
  await sidePanel(page, "Détails de la réservation").getByRole("button", { name: "Supprimer" }).click()
  await confirmAlert(page, "Supprimer la réservation")
  await expect(freeCell(page)).toBeVisible()
  booked = null
})

test("une élève réserve un avion avec un instructeur, l'instructeur le voit puis décline : l'élève retrouve son créneau", async ({
  page,
  browser,
}) => {
  const purpose = uniqueName("E2E instruction")

  const day = await test.step("sans licence valide, l'élève ne réserve qu'avec un instructeur", async () => {
    const dayLabel = await openCalendarAhead(page)
    await freeCell(page).click()
    const panel = sidePanel(page, "Créer une réservation")
    await expect(panel).toContainText(aircraft.registration)
    await expect(panel).toContainText(dayLabel)
    await panel.getByLabel("But de la réservation").fill(purpose)

    // The form says why, and sends nothing without an instructor.
    await expect(panel.getByText(/Sans licence valide, vous volez avec un instructeur/)).toBeVisible()
    await panel.getByRole("button", { name: "Créer la réservation" }).click()
    await expect(panel.getByText("Veuillez choisir un instructeur.")).toBeVisible()

    const instructor = panel.getByRole("combobox", { name: "Avec un instructeur" })
    await instructor.click()
    // Active instructors only, and no way to fly without one.
    await expect(page.getByRole("option", { name: "Sans instructeur" })).toHaveCount(0)
    await expect(page.getByRole("option", { name: "Jean Dupont" })).toHaveCount(0)
    await page.getByRole("option", { name: INSTRUCTOR, exact: true }).click()

    // A flight with an instructor is an instruction flight.
    const category = panel.getByRole("combobox", { name: "Catégorie de vol" })
    await expect(category).toContainText("Instruction")
    await expect(category).toBeDisabled()

    await panel.getByRole("button", { name: "Créer la réservation" }).click()
    booked = { purpose, day: dayLabel.match(/\d+/)![0] }
    await expect(toast(page, "Réservation créée")).toBeVisible()
    await expect(panel).toBeHidden()
    return booked.day
  })

  await test.step("le calendrier et le détail montrent l'instructeur", async () => {
    const slot = page.getByRole("button", { name: new RegExp(`^${purpose}`) })
    await expect(slot).toContainText(`avec ${INSTRUCTOR}`)
    await slot.click()
    const detail = sidePanel(page, "Détails de la réservation")
    await expect(detail.getByRole("heading", { name: purpose })).toBeVisible()
    await expect(detail).toContainText("Instructeur")
    await expect(detail).toContainText(INSTRUCTOR)
    await expect(detail).toContainText("Instruction")
    await expect(detail).toContainText(`${HOUR} – ${END}`)
    // The student pays the aircraft, and only the aircraft: one hour at one cent.
    await expect(detail).toContainText(/0,01\s€/)
    await detail.getByRole("button", { name: "Fermer" }).click()
  })

  await test.step("l'instructeur voit le vol dans ses réservations et le décline", async () => {
    await asRole(browser, "instructor", async (instructorPage) => {
      await instructorPage.goto("/reservations/my")
      await instructorPage.getByRole("tab", { name: /^Comme instructeur/ }).click()
      const card = instructorPage.locator("[data-instruction-booking]").filter({ hasText: purpose })
      await expect(card).toHaveCount(1)
      await expect(card).toContainText(aircraft.registration)
      await expect(card).toContainText(STUDENT.name)
      await expect(card).toContainText(`${HOUR} – ${END}`)

      await card.getByRole("button", { name: "Décliner le vol" }).click()
      await expect(instructorPage.getByRole("alertdialog")).toContainText("Décliner ce vol d'instruction ?")
      await expect(instructorPage.getByRole("alertdialog")).toContainText(`La réservation de ${aircraft.registration}`)
      await confirmAlert(instructorPage, "Décliner le vol")
      await expect(toast(instructorPage, "Réservation annulée")).toBeVisible()
      await expect(card).toHaveCount(0)
    })
    booked = null
  })

  await test.step("le créneau est de nouveau libre et l'élève n'a plus la réservation", async () => {
    await openCalendarAhead(page, day)
    await expect(freeCell(page)).toBeVisible()
    await expect(page.getByRole("button", { name: new RegExp(`^${purpose}`) })).toHaveCount(0)

    await page.goto("/reservations/my")
    await expect(page.getByRole("heading", { level: 1, name: "Mes réservations" })).toBeVisible()
    await expect(page.getByText(purpose)).toHaveCount(0)
  })
})
