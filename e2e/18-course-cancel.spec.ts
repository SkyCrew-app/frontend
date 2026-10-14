import type { Page } from "@playwright/test"
import { test, expect, sidePanel, toast, choose, confirmAlert, asRole } from "./support/test"
import { sessionFile, ACCOUNTS } from "./support/accounts"
import { ensureAircraft, type TestAircraft } from "./support/aircraft"

test.use({ storageState: sessionFile("instructor") })

const STUDENT = ACCOUNTS.student.name
// The permanent test aircraft, at one cent an hour: the student's balance barely moves.
const aircraft: TestAircraft = { registration: "F-EEEE", model: "E2E avion des tests" }
const pad = (value: number) => String(value).padStart(2, "0")

// A day about five weeks ahead, neither a Sunday (club closed) nor a Monday (weekly
// maintenance), at an hour no other journey books.
const day = (() => {
  const date = new Date()
  date.setDate(date.getDate() + 35 + (Date.now() % 7))
  while (date.getDay() === 0 || date.getDay() === 1) date.setDate(date.getDate() + 1)
  return date
})()
const isoDay = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`
const dateLabel = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(day)
const timeRange = "17:00 – 18:00"

const courseRow = (page: Page) =>
  page.getByRole("table").getByRole("row").filter({ hasText: STUDENT }).filter({ hasText: timeRange }).filter({ hasText: dateLabel })

test.beforeAll(async ({ browser }) => {
  await asRole(browser, "admin", (page) => ensureAircraft(page, aircraft, "0.01"))
})

let planned = false

// Whatever happened, the course and its booking go.
test.afterEach(async ({ page }) => {
  if (!planned) return
  planned = false
  await page.goto("/instruction/courses")
  await expect(page.getByRole("table").getByRole("row").nth(1)).toBeVisible()
  if ((await courseRow(page).count()) === 0) return
  await courseRow(page).getByRole("button", { name: "Actions du cours" }).click()
  await page.getByRole("menuitem", { name: "Supprimer" }).click()
  await confirmAlert(page, "Supprimer")
})

test("l'instructeur supprime un cours dont l'avion est réservé : la réservation est annulée et l'élève remboursé", async ({
  page,
  browser,
}) => {
  await test.step("il planifie le cours et réserve son avion", async () => {
    await page.goto("/instruction/courses")
    await page.getByRole("button", { name: "Planifier un cours" }).click()
    const panel = sidePanel(page, "Planifier un cours")
    await choose(page, panel.getByRole("combobox", { name: "Élève" }), STUDENT)
    await panel.getByLabel("Début").fill(`${isoDay}T17:00`)
    await panel.getByLabel("Fin").fill(`${isoDay}T18:00`)
    await panel.getByRole("button", { name: "Planifier le cours" }).click()
    planned = true
    await expect(toast(page, "Cours planifié")).toBeVisible()

    await page.getByRole("searchbox", { name: "Rechercher un cours par personne" }).fill(STUDENT)
    await courseRow(page).getByRole("link").first().click()
    await page.getByRole("link", { name: "Réserver un avion" }).click()
    const booking = sidePanel(page, "Nouvelle réservation")
    await choose(page, booking.getByRole("combobox", { name: /Avion/ }), new RegExp(`^${aircraft.registration}`))
    await booking.getByRole("button", { name: "Créer la réservation" }).click()
    await expect(toast(page, "Réservation créée")).toBeVisible()
    await expect(booking).toBeHidden()
  })

  await test.step("la confirmation montre la réservation et propose de l'annuler avec le cours", async () => {
    await page.goto("/instruction/courses")
    await page.getByRole("searchbox", { name: "Rechercher un cours par personne" }).fill(STUDENT)
    await courseRow(page).getByRole("button", { name: "Actions du cours" }).click()
    await page.getByRole("menuitem", { name: "Supprimer" }).click()
    const dialog = page.getByRole("alertdialog")
    await expect(dialog).toContainText("Réservation de l'avion du cours")
    await expect(dialog).toContainText(`${aircraft.registration} · ${dateLabel} · ${timeRange}`)
    await expect(dialog).toContainText(/Payée par l'élève : 0,01\s€/)
    await expect(dialog.getByRole("checkbox", { name: "Annuler aussi la réservation de l'avion et rembourser l'élève" })).toBeChecked()

    await confirmAlert(page, "Supprimer")
    await expect(toast(page, "Cours supprimé")).toBeVisible()
    await expect(
      toast(page, `La réservation de ${aircraft.registration} est annulée et l'élève a été remboursé.`),
    ).toBeVisible()
    await expect(courseRow(page)).toHaveCount(0)
    planned = false
  })

  await test.step("l'élève n'a plus la réservation", async () => {
    await asRole(browser, "student", async (student) => {
      await student.goto("/reservations/my")
      await expect(student.getByRole("heading", { level: 1, name: "Mes réservations" })).toBeVisible()
      await expect(
        student.locator(".flex.h-full").filter({ hasText: aircraft.registration }).filter({ hasText: `${dateLabel} · 17:00` }),
      ).toHaveCount(0)
    })
  })
})
