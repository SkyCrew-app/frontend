import { test as base, expect, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test"
import { ACCOUNTS, DEMO_PASSWORD, sessionFile, type Role } from "./accounts"

export const LANGUAGE_KEY = "skycrew-language"

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  ...(process.env.E2E_ALLOWED_HOSTS ?? "").split(",").map((host) => host.trim()).filter(Boolean),
])

/** True for the stack under test; everything else (maps, payment SDKs, weather…) is a third party. */
export const isLocalUrl = (url: string | URL, baseURL?: string) => {
  try {
    const { hostname, protocol } = new URL(url)
    if (!protocol.startsWith("http")) return true
    return LOCAL_HOSTS.has(hostname) || hostname.endsWith(".localhost") || (!!baseURL && hostname === new URL(baseURL).hostname)
  } catch {
    return true
  }
}

async function prepareContext(context: BrowserContext, baseURL?: string) {
  // Every page starts in French unless the journey itself picked a language.
  await context.addInitScript((key) => {
    if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, "fr")
  }, LANGUAGE_KEY)
  // The suite never leaves the stack under test: third-party requests are refused.
  await context.route(
    (url) => !isLocalUrl(url, baseURL),
    (route) => route.abort(),
  )
}

export const test = base.extend({
  // "provide" is Playwright's `use`, renamed so the React hooks lint rule does not mistake it for a hook.
  context: async ({ context, baseURL }, provide) => {
    await prepareContext(context, baseURL)
    await provide(context)
  },
})

/** Runs a few steps as another role, in its own window (fixtures created for another role, cleaning up). */
export async function asRole<T>(browser: Browser, role: Role, steps: (page: Page) => Promise<T>): Promise<T> {
  const baseURL = test.info().project.use.baseURL
  const context = await browser.newContext({ ...test.info().project.use, storageState: sessionFile(role) })
  try {
    await prepareContext(context, baseURL)
    return await steps(await context.newPage())
  } finally {
    await context.close()
  }
}

export { expect }

/** Name unique to this run, so a rerun never meets what an earlier run left. */
export const uniqueName = (prefix = "E2E") => `${prefix} ${Date.now()}`

export async function signIn(page: Page, role: Role, password = DEMO_PASSWORD) {
  await page.goto("/")
  await page.getByLabel("Adresse e-mail").fill(ACCOUNTS[role].email)
  await page.getByLabel("Mot de passe").fill(password)
  await page.getByRole("button", { name: "Se connecter" }).click()
}

/** The open side panel (create and edit forms). */
export const sidePanel = (page: Page, name?: string | RegExp) => page.getByRole("dialog", name ? { name } : undefined)

/** Picks an option of a Radix select: the list is rendered outside the trigger. */
export async function choose(page: Page, trigger: Locator, option: string | RegExp) {
  await trigger.click()
  await page.getByRole("option", { name: option, exact: true }).click()
}

/** A toast, matched on its title. */
export const toast = (page: Page, title: string | RegExp) =>
  page.getByRole("region", { name: /Notifications/ }).getByText(title).first()

/** Confirms the open destructive confirmation. */
export async function confirmAlert(page: Page, action: string | RegExp) {
  const alert = page.getByRole("alertdialog")
  await expect(alert).toBeVisible()
  await alert.getByRole("button", { name: action }).click()
  await expect(alert).toBeHidden()
}
