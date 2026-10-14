import { test, expect, sidePanel, toast, choose, confirmAlert, asRole } from "./support/test"
import { ACCOUNTS } from "./support/accounts"

const PILOT = ACCOUNTS.pilot.name

// A member enters a licence of their own; it waits for an administrator, who validates it from
// the member's sheet. The licence is deleted at the end, so the pilot's licences stay as seeded.
test("le pilote ajoute une licence, l'administrateur la valide", async ({ browser }) => {
  const number = `E2E-${Date.now()}`

  await test.step("le pilote ajoute sa licence : elle part en validation", async () => {
    await asRole(browser, "pilot", async (page) => {
      await page.goto("/profile")
      await page.getByRole("tab", { name: "Licences" }).click()
      await page.getByRole("button", { name: "Ajouter une licence" }).first().click()

      const panel = sidePanel(page, "Ajouter une licence")
      await expect(panel).toContainText("attend la validation d'un administrateur")
      await choose(page, panel.getByRole("combobox", { name: /Type de licence/ }), /^CPL/)
      await panel.getByLabel(/^Numéro/).fill(number)
      await panel.getByLabel("Autorité").fill("DGAC")
      // The issue date: today, from the calendar of the picker.
      await panel.getByRole("button", { name: "Choisir une date" }).click()
      await page.getByRole("dialog").getByRole("button", { name: "Aujourd'hui" }).click()
      await panel.getByRole("button", { name: "Ajouter la licence" }).click()

      await expect(toast(page, "Licence ajoutée")).toBeVisible()
      await expect(panel).toBeHidden()
      // The pilot's other licences are valid: the only one waiting is the new one.
      const licences = page.getByRole("tabpanel")
      await expect(licences).toContainText(number)
      await expect(licences.getByText("En attente de validation par un administrateur")).toHaveCount(1)
    })
  })

  await test.step("l'administrateur la retrouve parmi les licences à valider et la valide", async () => {
    await asRole(browser, "admin", async (page) => {
      await page.goto("/administration/users")
      await expect(page.getByText(/licences? attend/)).toBeVisible()
      await page.getByRole("button", { name: new RegExp(`^Ouvrir la fiche de ${PILOT}`) }).click()

      const sheet = sidePanel(page, new RegExp(PILOT))
      await expect(sheet.getByRole("tab", { name: /Licences/ })).toHaveAttribute("aria-selected", "true")
      await expect(sheet).toContainText(`Licence CPL n° ${number} en attente de validation`)
      await sheet.getByRole("button", { name: "Valider la licence CPL" }).click()
      // The sheet stays open (its toast is then outside what is announced): the licence itself says it.
      await expect(sheet).not.toContainText(`n° ${number} en attente`)
      await expect(sheet.getByRole("row").filter({ hasText: number })).toContainText("Valide")
    })
  })

  await test.step("le pilote la voit valide", async () => {
    await asRole(browser, "pilot", async (page) => {
      await page.goto("/profile")
      await page.getByRole("tab", { name: "Licences" }).click()
      await expect(page.getByRole("tabpanel")).toContainText(number)
      await expect(page.getByRole("tabpanel")).not.toContainText("En attente de validation par un administrateur")
    })
  })

  await test.step("ménage : l'administrateur supprime la licence de test", async () => {
    await asRole(browser, "admin", async (page) => {
      await page.goto("/administration/users")
      await page.getByRole("searchbox", { name: "Rechercher un membre" }).fill(PILOT.split(" ")[1])
      await page.getByRole("table").getByText(PILOT).first().click()
      const sheet = sidePanel(page, new RegExp(PILOT))
      await sheet.getByRole("tab", { name: /Licences/ }).click()
      await sheet.getByRole("row").filter({ hasText: number }).getByRole("button", { name: "Actions sur la licence CPL" }).click()
      await page.getByRole("menuitem", { name: "Supprimer" }).click()
      await confirmAlert(page, "Supprimer la licence")
      await expect(sheet.getByRole("row").filter({ hasText: number })).toHaveCount(0)
    })
  })
})
