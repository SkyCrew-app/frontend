import type { Page } from "@playwright/test"
import { test, expect, sidePanel, toast, confirmAlert, uniqueName } from "./support/test"
import { sessionFile } from "./support/accounts"

test.use({ storageState: sessionFile("admin") })

const deleteButton = (page: Page, title: string) => page.getByRole("button", { name: `Supprimer l'article « ${title} »` })

async function deleteArticle(page: Page, title: string) {
  await deleteButton(page, title).click()
  await expect(page.getByRole("alertdialog")).toContainText("Supprimer cet article ?")
  await expect(page.getByRole("alertdialog")).toContainText(title)
  await confirmAlert(page, "Supprimer")
  await expect(toast(page, "Article supprimé")).toBeVisible()
  await expect(deleteButton(page, title)).toHaveCount(0)
}

// Title of the article still published if the journey stops before its own deletion.
let leftover: string | null = null

test.afterEach(async ({ page }) => {
  if (!leftover) return
  const title = leftover
  leftover = null
  await page.goto("/administration/articles")
  await expect(page.getByRole("table").getByRole("row").nth(1)).toBeVisible()
  if ((await deleteButton(page, title).count()) > 0) await deleteArticle(page, title)
})

test("l'administrateur publie un article, le voit dans les actualités puis le supprime", async ({ page }) => {
  const title = uniqueName("E2E article")
  const summary = `Résumé ${title}`

  await page.goto("/administration/articles")
  await expect(page.getByRole("heading", { level: 1, name: "Articles" })).toBeVisible()

  await test.step("publication", async () => {
    await page.getByRole("button", { name: "Nouvel article" }).click()
    const panel = sidePanel(page, "Nouvel article")
    await panel.getByLabel("Titre").fill(title)
    await panel.getByLabel("Résumé").fill(summary)
    await panel.getByRole("button", { name: "Suivant" }).click()

    const editor = panel.locator("[contenteditable='true']")
    await editor.click()
    await editor.pressSequentially("Contenu rédigé par le parcours automatisé.")
    await panel.getByRole("button", { name: "Suivant" }).click()

    await panel.getByRole("button", { name: "Publier l'article" }).click()
    leftover = title
    await expect(toast(page, "Article publié")).toBeVisible()
    await expect(panel).toBeHidden()
  })

  await test.step("lecture dans les actualités", async () => {
    await page.goto("/articles")
    const link = page.getByRole("link", { name: new RegExp(title) }).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/articles\/\d+$/)
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
    await expect(page.getByText("Contenu rédigé par le parcours automatisé.")).toBeVisible()
  })

  await test.step("suppression", async () => {
    await page.goto("/administration/articles")
    await expect(page.getByRole("table").getByRole("link", { name: title })).toBeVisible()
    await deleteArticle(page, title)
    leftover = null
    await expect(page.getByRole("link", { name: title })).toHaveCount(0)

    await page.goto("/articles")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByText(title)).toHaveCount(0)
  })
})
