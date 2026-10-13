import { test as base, expect, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test"
import { ACCOUNTS, DEMO_PASSWORD, sessionFile, type Role } from "./accounts"
import { stubWeather } from "./weather"

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

// The browser refusing something under the Content-Security-Policy of the page. Never noise,
// even about a third party: the policy is checked before the suite refuses the request.
export const POLICY_VIOLATION = /Content Security Policy|Content-Security-Policy/i

/**
 * Prepares a window of the suite. Returns what the browser refused under the
 * Content-Security-Policy while the journey ran: every journey checks it is empty.
 */
export async function prepareContext(context: BrowserContext, baseURL?: string) {
  // Every page starts in French unless the journey itself picked a language.
  await context.addInitScript((key) => {
    if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, "fr")
  }, LANGUAGE_KEY)
  // The suite never leaves the stack under test: third-party requests are refused.
  await context.route(
    (url) => !isLocalUrl(url, baseURL),
    (route) => route.abort(),
  )
  // The API asks a provider for the weather of the dashboard: answered by the suite too.
  await stubWeather(context)

  const refused: string[] = []
  context.on("console", (message) => {
    if (POLICY_VIOLATION.test(message.text())) refused.push(`${message.page()?.url() ?? ""} : ${message.text()}`)
  })
  return refused
}

const expectNothingRefused = (refused: string[]) =>
  expect(refused, "refus du navigateur au titre de la politique de sécurité du contenu").toEqual([])

export const test = base.extend({
  // "provide" is Playwright's `use`, renamed so the React hooks lint rule does not mistake it for a hook.
  context: async ({ context, baseURL }, provide) => {
    const refused = await prepareContext(context, baseURL)
    await provide(context)
    // Whatever the journey did (forms, dialogs, downloads), on every screen it went through.
    expectNothingRefused(refused)
  },
})

/** Runs a few steps as another role, in its own window (fixtures created for another role, cleaning up). */
export async function asRole<T>(browser: Browser, role: Role, steps: (page: Page) => Promise<T>): Promise<T> {
  const baseURL = test.info().project.use.baseURL
  const context = await browser.newContext({ ...test.info().project.use, storageState: sessionFile(role) })
  try {
    const refused = await prepareContext(context, baseURL)
    const result = await steps(await context.newPage())
    expectNothingRefused(refused)
    return result
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
