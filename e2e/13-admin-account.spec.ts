import type { Page } from "@playwright/test"
import { test, expect, uniqueName } from "./support/test"
import { sessionFile } from "./support/accounts"
import { euros, findMember, openMemberSheet } from "./support/members"

test.use({ storageState: sessionFile("admin") })

// A member of the demo data set no other journey looks at. The entry is made, then undone by
// the opposite one: the balance ends where it started, two account lines and two lines of the
// action log stay (neither can be deleted).
const MEMBER = { email: "antoine.roux@skycrew.fr", name: "Antoine Roux" }
const AMOUNT = "0,01"

// The sheet of the member stays open behind the entry form, and an open sheet hides the rest of
// the page from assistive technology, the notification area included: the toast is on screen
// but has no role to be found by. It is looked for by its text.
const announcement = (page: Page, title: string) => page.getByText(title, { exact: true }).first()

test("l'administrateur crédite puis débite le compte d'un membre : le journal des actions le retient", async ({ page }) => {
  const credited = uniqueName("E2E chèque")
  const debited = uniqueName("E2E correction")

  const row = await findMember(page, MEMBER.email)
  const { sheet, balance, balanceText } = await openMemberSheet(page, row, MEMBER.name)
  const panel = page.getByRole("dialog", { name: "Créditer ou débiter le compte" })

  await test.step("le formulaire refuse une écriture sans montant ni motif", async () => {
    await sheet.getByRole("button", { name: "Créditer ou débiter" }).click()
    await expect(panel).toContainText(MEMBER.name)
    await panel.getByRole("button", { name: "Créditer", exact: true }).click()
    await expect(panel.getByText("Indiquez un montant positif, avec deux décimales au plus.")).toBeVisible()
    await expect(panel.getByText("Indiquez le motif de l'opération.")).toBeVisible()
  })

  await test.step("crédit par chèque", async () => {
    await panel.getByLabel(/^Montant/).fill(AMOUNT)
    await panel.getByRole("radio", { name: "Chèque" }).click()
    await panel.getByLabel(/^Motif/).fill(credited)
    await expect(panel.getByText(/^Nouveau solde/)).toBeVisible()
    expect(euros(await panel.getByText(/^Nouveau solde/).innerText())).toBeCloseTo(balance + 0.01, 2)
    await panel.getByRole("button", { name: "Créditer", exact: true }).click()

    await expect(announcement(page, "Compte crédité")).toBeVisible()
    await expect(panel).toBeHidden()
    // The sheet shows the new balance without being reopened.
    await expect.poll(async () => euros(await balanceText.innerText())).toBeCloseTo(balance + 0.01, 2)
  })

  await test.step("débit du même montant : le solde revient à sa valeur", async () => {
    await sheet.getByRole("button", { name: "Créditer ou débiter" }).click()
    await panel.getByRole("radio", { name: "Débiter le compte" }).click()
    await panel.getByLabel(/^Montant/).fill(AMOUNT)
    await panel.getByRole("radio", { name: "Correction" }).click()
    await panel.getByLabel(/^Motif/).fill(debited)
    await panel.getByRole("button", { name: "Débiter", exact: true }).click()

    await expect(announcement(page, "Compte débité")).toBeVisible()
    await expect(panel).toBeHidden()
    await expect.poll(async () => euros(await balanceText.innerText())).toBeCloseTo(balance, 2)
  })

  await test.step("les deux écritures sont au journal des actions, avec leur auteur et leur motif", async () => {
    await page.goto("/administration/actions")
    await expect(page.getByRole("heading", { level: 1, name: "Journal des actions" })).toBeVisible()
    await page.getByRole("combobox", { name: "Type d'action" }).click()
    await page.getByRole("option", { name: "Écriture manuelle sur un compte", exact: true }).click()

    const lines = page.getByRole("table").getByRole("row")
    const credit = lines.filter({ hasText: credited })
    await expect(credit).toHaveCount(1)
    await expect(credit).toContainText("Demo Admin")
    await expect(credit).toContainText("Écriture manuelle sur un compte")
    await expect(credit).toContainText(`Membre : ${MEMBER.name}`)
    await expect(credit).toContainText(/Montant : 0,01\s€/)
    await expect(credit).toContainText("Sens : crédit")
    await expect(credit).toContainText("Moyen : chèque")

    const debit = lines.filter({ hasText: debited })
    await expect(debit).toHaveCount(1)
    await expect(debit).toContainText("Sens : débit")
    await expect(debit).toContainText("Moyen : correction")
  })
})
