import { test, expect, sidePanel, toast, choose } from "./support/test"
import { sessionFile } from "./support/accounts"

test.use({ storageState: sessionFile("admin") })

// The application has no way to delete a member: each run leaves one invited account behind.
test("l'administrateur ajoute un membre et le retrouve avec la recherche", async ({ page }) => {
  const stamp = Date.now()
  const lastName = `Membre${stamp}`
  const email = `e2e.${stamp}@example.test`

  await page.goto("/administration/users")
  await expect(page.getByRole("heading", { level: 1, name: "Membres" })).toBeVisible()

  await page.getByRole("button", { name: "Ajouter un membre" }).click()
  const panel = sidePanel(page, "Ajouter un membre")
  await panel.getByLabel("Prénom").fill("E2E")
  await panel.getByRole("textbox", { name: /^Nom/ }).fill(lastName)
  await panel.getByLabel("Adresse e-mail").fill(email)
  await panel.getByLabel("Date de naissance").fill("1990-05-15")
  await panel.getByRole("button", { name: "Ajouter le membre" }).click()

  await expect(toast(page, "Membre ajouté")).toBeVisible()
  await expect(panel).toBeHidden()

  await page.getByRole("searchbox", { name: "Rechercher un membre" }).fill(lastName)
  const rows = page.getByRole("table").getByRole("row").filter({ has: page.getByRole("cell") })
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText(`E2E ${lastName}`)
  await expect(rows.first()).toContainText(email)
  await expect(rows.first()).toContainText("15 mai 1990")
  await expect(rows.first()).toContainText("Invitation en attente")

  // The API gives every new member the Administrateur role (see e2e/README.md). The account
  // cannot be deleted, so it is handed the Pilote role rather than left as a pending administrator.
  await test.step("rôle Pilote", async () => {
    await rows.first().getByRole("button", { name: `Actions pour E2E ${lastName}` }).click()
    await page.getByRole("menuitem", { name: "Modifier" }).click()
    const edit = sidePanel(page, "Modifier le membre")
    await choose(page, edit.getByRole("combobox", { name: "Rôle" }), "Pilote")
    await edit.getByRole("button", { name: "Enregistrer" }).click()

    await expect(toast(page, "Membre mis à jour")).toBeVisible()
    await expect(edit).toBeHidden()
    await expect(rows.first().getByRole("cell", { name: "Pilote", exact: true })).toBeVisible()
  })
})
