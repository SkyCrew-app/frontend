import type { Page } from "@playwright/test"
import { test, expect, sidePanel, toast, confirmAlert, choose, uniqueName } from "./support/test"
import { sessionFile } from "./support/accounts"

test.use({ storageState: sessionFile("admin") })

const AIRCRAFT = "F-GPIL"

const bodyRows = (page: Page) => page.getByRole("table").getByRole("row").filter({ has: page.getByRole("cell") })
const taskRows = (page: Page) => bodyRows(page).filter({ hasText: AIRCRAFT })
const emptyList = (page: Page) => page.getByRole("table").getByText("Aucune maintenance ne correspond")

// The description is not a column of the list: the search is what singles the task out.
async function findTask(page: Page, description: string) {
  await page.goto("/fleet/maintenance")
  await expect(page.getByRole("heading", { level: 1, name: "Maintenances" })).toBeVisible()
  await expect(bodyRows(page).first()).toBeVisible()
  await page.getByRole("textbox", { name: "Rechercher des maintenances" }).fill(description)
  // One line is left: the task, or the "nothing matches" line.
  await expect(bodyRows(page)).toHaveCount(1)
}

async function deleteTask(page: Page) {
  await taskRows(page).first().getByRole("button", { name: `Actions pour la maintenance de ${AIRCRAFT}` }).click()
  await page.getByRole("menuitem", { name: "Supprimer" }).click()
  await expect(page.getByRole("alertdialog")).toContainText("Supprimer cette maintenance ?")
  await confirmAlert(page, "Supprimer")
  await expect(toast(page, "Maintenance supprimée")).toBeVisible()
  await expect(emptyList(page)).toBeVisible()
  await expect(taskRows(page)).toHaveCount(0)
}

// Description of the task still in the list if the journey stops before its own deletion.
let leftover: string | null = null

test.afterEach(async ({ page }) => {
  if (!leftover) return
  const description = leftover
  leftover = null
  await findTask(page, description)
  if ((await taskRows(page).count()) > 0) await deleteTask(page)
})

test("l'administrateur planifie une maintenance, la retrouve dans la liste puis la supprime", async ({ page }) => {
  const description = uniqueName("E2E maintenance")

  await page.goto("/fleet/maintenance")
  await expect(page.getByRole("heading", { level: 1, name: "Maintenances" })).toBeVisible()

  await test.step("création", async () => {
    await page.getByRole("button", { name: "Nouvelle maintenance" }).click()
    const panel = sidePanel(page, "Nouvelle maintenance")

    await choose(page, panel.getByRole("combobox", { name: "Aéronef" }), new RegExp(`^${AIRCRAFT}`))
    await choose(page, panel.getByRole("combobox", { name: "Type" }), "Nettoyage")
    await expect(panel.getByRole("combobox", { name: "Statut" })).toContainText("Planifiée")
    await panel.getByRole("button", { name: "Suivant" }).click()

    await panel.getByLabel("Description").fill(description)
    await panel.getByLabel("Coût").fill("42")
    await panel.getByRole("button", { name: "Suivant" }).click()

    await expect(panel.getByRole("button", { name: "Ajouter des images" })).toBeVisible()
    await panel.getByRole("button", { name: "Créer la maintenance" }).click()
    leftover = description

    await expect(toast(page, "Maintenance créée")).toBeVisible()
    await expect(panel).toBeHidden()
  })

  await test.step("la maintenance est dans la liste", async () => {
    await findTask(page, description)
    await expect(taskRows(page)).toHaveCount(1)
    const row = taskRows(page).first()
    await expect(row).toContainText(AIRCRAFT)
    await expect(row).toContainText("Nettoyage")
    await expect(row).toContainText("Planifiée")
    await expect(row).toContainText("42,00 €")
  })

  await test.step("suppression", async () => {
    await deleteTask(page)
    leftover = null
  })
})
