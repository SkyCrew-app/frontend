import type { Page } from "@playwright/test"
import { test, expect, toast } from "./support/test"
import { sessionFile } from "./support/accounts"

test.use({ storageState: sessionFile("admin") })

const phoneField = (page: Page) => page.getByRole("tabpanel", { name: "Général" }).getByLabel("Téléphone de contact")

async function openSettings(page: Page) {
  await page.goto("/administration/settings")
  await expect(page.getByRole("heading", { level: 1, name: "Paramètres de l'aéroclub" })).toBeVisible()
  await expect(phoneField(page)).toHaveValue(/\d/)
  await expect(page.getByRole("status")).toHaveText("Aucune modification à enregistrer")
}

async function savePhone(page: Page, value: string) {
  await phoneField(page).fill(value)
  const save = page.getByRole("button", { name: "Enregistrer", exact: true })
  await expect(save).toBeEnabled()
  await save.click()
  await expect(toast(page, "Paramètres enregistrés")).toBeVisible()
  await expect(save).toBeDisabled()
}

// The club's contact phone before the journey, put back whatever happens.
let original: string | null = null
let changed = false

test.afterEach(async ({ page }) => {
  if (!changed || original === null) return
  await openSettings(page)
  if ((await phoneField(page).inputValue()) !== original) await savePhone(page, original)
  changed = false
})

test("l'administrateur modifie un paramètre du club puis le rétablit", async ({ page }) => {
  await openSettings(page)
  original = await phoneField(page).inputValue()
  // Same format, another last digit.
  const updated = original.slice(0, -1) + (original.endsWith("7") ? "8" : "7")

  await test.step("modification", async () => {
    changed = true
    await savePhone(page, updated)
    // Read again from the API, not from the form.
    await openSettings(page)
    await expect(phoneField(page)).toHaveValue(updated)
  })

  await test.step("rétablissement", async () => {
    await savePhone(page, original!)
    await openSettings(page)
    await expect(phoneField(page)).toHaveValue(original!)
    changed = false
  })
})
