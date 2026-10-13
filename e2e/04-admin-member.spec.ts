import { test, expect, sidePanel, toast, choose, confirmAlert } from "./support/test"
import { sessionFile } from "./support/accounts"

test.use({ storageState: sessionFile("admin") })

// The account created here has no history, so the run ends by deleting it.
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

  // A new member is a pilot unless the administrator says otherwise (it used to be an administrator).
  await expect(rows.first().getByRole("cell", { name: "Pilote", exact: true })).toBeVisible()

  // The edit form saves and keeps the role.
  await test.step("modification du membre", async () => {
    await rows.first().getByRole("button", { name: `Actions pour E2E ${lastName}` }).click()
    await page.getByRole("menuitem", { name: "Modifier" }).click()
    const edit = sidePanel(page, "Modifier le membre")
    await choose(page, edit.getByRole("combobox", { name: "Rôle" }), "Pilote")
    await edit.getByRole("button", { name: "Enregistrer" }).click()

    await expect(toast(page, "Membre mis à jour")).toBeVisible()
    await expect(edit).toBeHidden()
    await expect(rows.first().getByRole("cell", { name: "Pilote", exact: true })).toBeVisible()
  })

  const openActions = () => rows.first().getByRole("button", { name: `Actions pour E2E ${lastName}` }).click()

  await test.step("désactivation puis réactivation du compte", async () => {
    await openActions()
    await page.getByRole("menuitem", { name: "Désactiver le compte" }).click()
    await expect(page.getByRole("alertdialog")).toContainText(`Désactiver le compte de E2E ${lastName} ?`)
    // The dialog says what the member still has ahead of them: nothing, for a new one.
    await expect(page.getByRole("alertdialog")).toContainText("Aucune réservation à venir.")
    await confirmAlert(page, "Désactiver")
    await expect(toast(page, "Compte désactivé")).toBeVisible()
    await expect(rows.first()).toContainText("Désactivé")

    await openActions()
    await page.getByRole("menuitem", { name: "Réactiver le compte" }).click()
    await expect(toast(page, "Compte réactivé")).toBeVisible()
    await expect(rows.first()).toContainText("Invitation en attente")
  })

  // Only possible because this member never booked, flew or was invoiced.
  await test.step("suppression du compte créé par erreur", async () => {
    await openActions()
    await page.getByRole("menuitem", { name: "Supprimer le membre" }).click()
    await expect(page.getByRole("alertdialog")).toContainText(`Supprimer E2E ${lastName} ?`)
    await confirmAlert(page, "Supprimer")
    await expect(toast(page, "Membre supprimé")).toBeVisible()
    await expect(rows).toHaveCount(0)
  })
})

test("un membre qui a un historique ne peut pas être supprimé", async ({ page }) => {
  await page.goto("/administration/users")
  await page.getByRole("searchbox", { name: "Rechercher un membre" }).fill("jean.dupont@skycrew.fr")
  const rows = page.getByRole("table").getByRole("row").filter({ has: page.getByRole("cell") })
  await expect(rows).toHaveCount(1)

  await rows.first().getByRole("button", { name: "Actions pour Jean Dupont" }).click()
  await page.getByRole("menuitem", { name: "Supprimer le membre" }).click()
  await confirmAlert(page, "Supprimer")

  await expect(toast(page, "Le membre n'a pas pu être supprimé")).toBeVisible()
  await expect(page.getByText("Désactivez son compte à la place.").first()).toBeVisible()
  await expect(rows).toHaveCount(1)
})
