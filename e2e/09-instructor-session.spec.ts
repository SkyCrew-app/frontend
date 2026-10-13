import type { Page } from "@playwright/test"
import { test, expect, sidePanel, toast, confirmAlert, choose } from "./support/test"
import { sessionFile } from "./support/accounts"

test.use({ storageState: sessionFile("instructor") })

const STUDENT = "Emma Girard"
const pad = (value: number) => String(value).padStart(2, "0")

// A slot about a year ahead, to the minute of the run: no other course sits there.
const now = new Date()
const hour = 8 + (now.getSeconds() % 10)
const minutes = now.getMinutes()
const day = new Date(Date.UTC(now.getFullYear() + 1, now.getMonth(), now.getDate()))
const isoDay = day.toISOString().slice(0, 10)
const dateLabel = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(day)
const timeRange = `${pad(hour)}:${pad(minutes)} – ${pad(hour + 1)}:${pad(minutes)}`

const courseRow = (page: Page) =>
  page.getByRole("table").getByRole("row").filter({ hasText: STUDENT }).filter({ hasText: timeRange }).filter({ hasText: dateLabel })

async function deleteCourse(page: Page) {
  await courseRow(page).getByRole("button", { name: "Actions du cours" }).click()
  await page.getByRole("menuitem", { name: "Supprimer" }).click()
  await expect(page.getByRole("alertdialog")).toContainText("Supprimer ce cours ?")
  await expect(page.getByRole("alertdialog")).toContainText(STUDENT)
  await confirmAlert(page, "Supprimer")
  await expect(toast(page, "Cours supprimé")).toBeVisible()
  await expect(courseRow(page)).toHaveCount(0)
}

let scheduled = false

test.afterEach(async ({ page }) => {
  if (!scheduled) return
  scheduled = false
  await page.goto("/instruction/courses")
  await expect(page.getByRole("table").getByRole("row").nth(1)).toBeVisible()
  if ((await courseRow(page).count()) > 0) await deleteCourse(page)
})

test("l'instructeur planifie un cours, le voit dans la liste puis le supprime", async ({ page }) => {
  await page.goto("/instruction/courses")
  await expect(page.getByRole("heading", { level: 1, name: "Mes cours" })).toBeVisible()

  await test.step("planification", async () => {
    await page.getByRole("button", { name: "Planifier un cours" }).click()
    const panel = sidePanel(page, "Planifier un cours")
    await choose(page, panel.getByRole("combobox", { name: "Élève" }), STUDENT)
    await panel.getByLabel("Début").fill(`${isoDay}T${pad(hour)}:${pad(minutes)}`)
    await panel.getByLabel("Fin").fill(`${isoDay}T${pad(hour + 1)}:${pad(minutes)}`)
    await panel.getByRole("button", { name: "Planifier le cours" }).click()
    scheduled = true

    await expect(toast(page, "Cours planifié")).toBeVisible()
    await expect(panel).toBeHidden()
  })

  await test.step("le cours est dans la liste", async () => {
    await page.getByRole("searchbox", { name: "Rechercher un cours par personne" }).fill(STUDENT)
    await expect(courseRow(page)).toHaveCount(1)
    await expect(courseRow(page)).toContainText("Planifié")
    await expect(courseRow(page)).toContainText("Élève")
  })

  await test.step("le cours n'a pas encore d'avion : la réservation est proposée, préremplie", async () => {
    await courseRow(page).getByRole("link").first().click()
    await expect(page.getByRole("heading", { level: 1, name: `Cours du ${dateLabel}` })).toBeVisible()
    await expect(page.getByText("Aucun avion réservé")).toBeVisible()

    await page.getByRole("link", { name: "Réserver un avion" }).click()
    await expect(page).toHaveURL(/\/reservations$/)
    const panel = sidePanel(page, "Nouvelle réservation")
    // The student flies and pays, the instructor of the course instructs: neither is asked again.
    await expect(panel.getByRole("note")).toContainText(`Réservation de l'avion du cours de ${STUDENT} avec Marie Laurent`)
    await expect(panel.getByRole("combobox", { name: "Avec un instructeur" })).toHaveCount(0)
    await expect(panel.getByLabel("Début")).toHaveValue(`${pad(hour)}:${pad(minutes)}`)
    await expect(panel.getByLabel("Fin")).toHaveValue(`${pad(hour + 1)}:${pad(minutes)}`)
    // Nothing is booked here: the slot is a year ahead, only the pre-filled form is checked.
    await panel.getByRole("button", { name: "Annuler" }).click()
    await expect(panel).toBeHidden()

    await page.goto("/instruction/courses")
    await page.getByRole("searchbox", { name: "Rechercher un cours par personne" }).fill(STUDENT)
    await expect(courseRow(page)).toHaveCount(1)
  })

  await test.step("suppression", async () => {
    await deleteCourse(page)
    scheduled = false
  })
})
