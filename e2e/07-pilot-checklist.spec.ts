import { test, expect, sidePanel, toast, choose } from "./support/test"
import { sessionFile } from "./support/accounts"

test.use({ storageState: sessionFile("pilot") })

// A checklist cannot be deleted from the application: each run leaves one completed checklist.
test("le pilote démarre une checklist, coche chaque point et la termine", async ({ page }) => {
  await page.goto("/checklists")
  await expect(page.getByRole("heading", { level: 1, name: "Checklists" })).toBeVisible()

  await page.getByRole("button", { name: "Nouvelle checklist" }).click()
  const panel = sidePanel(page, "Démarrer une checklist")
  await expect(panel.getByRole("button", { name: "Démarrer la checklist" })).toBeDisabled()
  // The shortest template of the demo data.
  await choose(page, panel.getByRole("combobox", { name: "Modèle de checklist" }), /^Visite pré-vol Robin DR400/)
  await panel.getByRole("button", { name: "Démarrer la checklist" }).click()

  await expect(page).toHaveURL(/\/checklists\/\d+$/)
  const checklistPath = new URL(page.url()).pathname
  await expect(page.getByRole("heading", { level: 1, name: "Visite pré-vol Robin DR400" })).toBeVisible()
  await expect(page.getByRole("main")).toContainText("En cours")

  const finish = page.getByRole("button", { name: "Terminer la checklist" })
  await expect(finish).toBeDisabled()

  const items = page.getByRole("checkbox")
  await expect(items.first()).toBeVisible()
  const total = await items.count()
  expect(total).toBeGreaterThan(0)
  await expect(page.getByRole("main")).toContainText(`0 / ${total} points vérifiés`)

  for (let index = 0; index < total; index++) {
    await items.nth(index).click()
    await expect(items.nth(index)).toBeChecked()
  }
  await expect(page.getByRole("main")).toContainText(`${total} / ${total} points vérifiés`)
  await expect(page.getByRole("progressbar", { name: "Progression de la checklist" })).toBeVisible()
  // Answers are saved in the background: the checklist can only be closed once they are.
  await expect(page.getByText("Réponses enregistrées")).toBeVisible()

  await finish.click()
  await expect(toast(page, "Checklist terminée")).toBeVisible()
  await expect(page.getByRole("main")).toContainText("Terminée le")
  await expect(items.first()).toBeDisabled()

  await page.goto("/checklists")
  const entry = page.locator(`a[href="${checklistPath}"]`)
  await expect(entry).toContainText("Terminée")
  await expect(entry).toContainText(`${total} / ${total} points vérifiés`)
})
