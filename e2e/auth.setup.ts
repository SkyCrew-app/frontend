import fs from "node:fs"
import { test as setup, expect, signIn } from "./support/test"
import { ACCOUNTS, sessionFile, type Role } from "./support/accounts"

// A run lasts a few minutes: a saved session is reused while it has this much time left.
const MARGIN_SECONDS = 20 * 60

// The API limits sign-in attempts per address (10 a minute), so a session saved
// by the previous run is kept rather than signing in again.
const stillValid = (file: string) => {
  try {
    const state = JSON.parse(fs.readFileSync(file, "utf8")) as { cookies: { name: string; expires: number }[] }
    const token = state.cookies.find((cookie) => cookie.name === "token")
    return !!token && token.expires - Date.now() / 1000 > MARGIN_SECONDS
  } catch {
    return false
  }
}

for (const role of Object.keys(ACCOUNTS) as Role[]) {
  setup(`session ${role}`, async ({ browser, page }) => {
    const file = sessionFile(role)
    const sidebar = (target: typeof page) => target.getByRole("navigation", { name: "Navigation principale" })

    if (stillValid(file)) {
      const context = await browser.newContext({ storageState: file })
      const saved = await context.newPage()
      await saved.goto("/dashboard")
      const accepted = await sidebar(saved)
        .getByText(ACCOUNTS[role].name)
        .waitFor({ timeout: 15_000 })
        .then(() => true, () => false)
      await context.close()
      if (accepted) return
    }

    await signIn(page, role)
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(sidebar(page)).toContainText(ACCOUNTS[role].name)
    await page.context().storageState({ path: file })
  })
}
