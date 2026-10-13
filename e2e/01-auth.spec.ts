import { test, expect, signIn, toast } from "./support/test"
import { ACCOUNTS, sessionFile } from "./support/accounts"

test.describe("Connexion", () => {
  test("un membre se connecte puis se déconnecte", async ({ page }) => {
    await signIn(page, "pilot")
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole("heading", { level: 1, name: "Bienvenue, Jean" })).toBeVisible()

    await page.getByRole("button", { name: "Se déconnecter" }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible()

    // The session is really gone: a protected page sends back to the "not connected" page.
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/system\/notconnected$/)
  })

  test("un mot de passe erroné affiche l'erreur", async ({ page }) => {
    await signIn(page, "pilot", "not-the-password")
    await expect(toast(page, "Erreur de connexion")).toBeVisible()
    await expect(page.getByText("Identifiants incorrects.").first()).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
  })
})

test.describe("Droits d'un pilote", () => {
  test.use({ storageState: sessionFile("pilot") })

  test("le menu Administration n'est pas proposé et la page est refusée", async ({ page }) => {
    await page.goto("/dashboard")
    const sidebar = page.getByRole("navigation", { name: "Navigation principale" })
    // The profile decides what the menu shows: wait for it before asserting an absence.
    await expect(sidebar).toContainText(ACCOUNTS.pilot.name)
    await expect(sidebar.getByRole("link", { name: "Carnet de vol" })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Administration" })).toHaveCount(0)

    await page.goto("/administration")
    await expect(page).toHaveURL(/\/system\/unauthorized$/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })
})
