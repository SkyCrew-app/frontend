import type { Locator, Page } from "@playwright/test"
import { expect } from "./test"

/** The row of a member in the administration, found with the search (administrator). */
export async function findMember(page: Page, email: string): Promise<Locator> {
  await page.goto("/administration/users")
  await expect(page.getByRole("heading", { level: 1, name: "Membres" })).toBeVisible()
  await page.getByRole("searchbox", { name: "Rechercher un membre" }).fill(email)
  const rows = page.getByRole("table").getByRole("row").filter({ has: page.getByRole("cell") })
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText(email)
  return rows.first()
}

/** Opens the action menu of a member's row. */
export async function openMemberActions(page: Page, row: Locator, name: string) {
  await row.getByRole("button", { name: `Actions pour ${name}` }).click()
  await expect(page.getByRole("menu", { name: `Actions pour ${name}` })).toBeVisible()
}

/** "1 234,56 €" → 1234.56 */
export const euros = (text: string) => {
  const amount = text.match(/(-?\d[\d\s  ]*,\d{2})\s*€/)
  if (!amount) throw new Error(`No amount in "${text}"`)
  return Number(amount[1].replace(/[\s  ]/g, "").replace(",", "."))
}

/** Opens the sheet of a member from their row and returns it with the balance it shows. */
export async function openMemberSheet(page: Page, row: Locator, name: string) {
  await openMemberActions(page, row, name)
  await page.getByRole("menuitem", { name: "Voir la fiche" }).click()
  const sheet = page.getByRole("dialog", { name: new RegExp(`^${name}`) })
  const balance = sheet.locator("dt", { hasText: "Solde du compte" }).locator("xpath=following-sibling::dd[1]")
  await expect(balance).toContainText("€")
  return { sheet, balance: euros(await balance.innerText()), balanceText: balance }
}
