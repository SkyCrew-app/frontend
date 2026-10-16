import fs from "node:fs"
import path from "node:path"
import { chromium, request, type APIRequestContext, type FullConfig } from "@playwright/test"
import { sessionFile } from "./accounts"
import { prepareContext, signIn } from "./test"

// Runs once before the journeys (globalSetup of playwright.config.ts).
//
// A development server compiles a page the first time it is asked for, which can take longer
// than a journey waits for a navigation. Every page of the application is asked for once here,
// over plain HTTP and with patience, so that the journeys only ever meet compiled pages.
// Against a production build this lasts a second and only shows that the frontend answers.

const APP_DIR = path.join(__dirname, "..", "..", "src", "app")
// One page of a cold development server, on a loaded machine.
const PAGE_TIMEOUT = 180_000
// Pages served only in a state the journeys never put the installation in: the suspended-service
// page sends back home while the service runs (src/lib/proxy-rules.ts), with or without a session.
const NOT_SERVED_WHILE_RUNNING = new Set(["/system/suspended"])

/** Addresses of the pages under a folder of the app router; a parameter ("[id]") becomes 0. */
export function pagesUnder(dir: string, segments: string[] = []): string[] {
  const found: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  if (entries.some((entry) => entry.isFile() && /^page\.[jt]sx?$/.test(entry.name))) found.push(`/${segments.join("/")}`)
  for (const entry of entries) {
    // Private folders ("_components", "__tests__") hold no page.
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue
    const isGroup = /^\(.+\)$/.test(entry.name)
    const segment = entry.name.replace(/^\[.+\]$/, "0")
    found.push(...pagesUnder(path.join(dir, entry.name), isGroup ? segments : [...segments, segment]))
  }
  return found.sort((a, b) => a.localeCompare(b))
}

const durations: [string, number][] = []

/** Asks for each page; returns the ones that were not served (redirected to the sign-in notice). */
async function ask(api: APIRequestContext, baseURL: string, pages: string[], signedIn: boolean) {
  const refused: string[] = []
  for (const page of pages) {
    const started = Date.now()
    const response = await api.get(page, { timeout: PAGE_TIMEOUT, maxRedirects: 0 }).catch((error: Error) => {
      throw new Error(
        `The frontend does not answer on ${baseURL}${page} (${error.message.split("\n")[0]}). ` +
          "Start it, or set E2E_BASE_URL: see e2e/README.md.",
      )
    })
    const status = response.status()
    await response.dispose()
    if (status === 200) durations.push([page, Date.now() - started])
    else if (!signedIn && status >= 300 && status < 400) refused.push(page)
    else {
      throw new Error(
        `${baseURL}${page} answered ${status}` +
          (status >= 300 && status < 400 ? ` (to ${response.headers()["location"]}): the administrator's session was refused` : "") +
          ": the page cannot be served, the journeys would fail on it.",
      )
    }
  }
  return refused
}

/** Signs the administrator in with a browser, patiently, and saves the session for auth.setup.ts. */
async function administratorSession(config: FullConfig, baseURL: string) {
  const file = sessionFile("admin")
  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({ ...config.projects[0]?.use, baseURL, storageState: undefined })
    await prepareContext(context, baseURL)
    const page = await context.newPage()
    page.setDefaultTimeout(PAGE_TIMEOUT)
    page.setDefaultNavigationTimeout(PAGE_TIMEOUT)
    await signIn(page, "admin")
    await page.waitForURL(/\/dashboard$/)
    await page.getByRole("navigation", { name: "Navigation principale" }).waitFor()
    await context.storageState({ path: file })
  } finally {
    await browser.close()
  }
  return file
}

export default async function warmUp(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL
  if (!baseURL) throw new Error("No baseURL in playwright.config.ts")
  const pages = pagesUnder(APP_DIR).filter((page) => !NOT_SERVED_WHILE_RUNNING.has(page))
  if (pages.length < 10) throw new Error(`Only ${pages.length} pages found under ${APP_DIR}`)
  const started = Date.now()

  // Without a session: the public pages are served, the others send to the sign-in notice.
  const anonymous = await request.newContext({ baseURL })
  const needSession = await ask(anonymous, baseURL, pages, false)
  await anonymous.dispose()

  // With the administrator's session, who may open every page. The session of an earlier
  // run is used while the frontend accepts it: the API limits sign-ins per minute.
  const file = sessionFile("admin")
  const accepted = async () => {
    if (!fs.existsSync(file)) return false
    const saved = await request.newContext({ baseURL, storageState: file })
    const response = await saved.get("/dashboard", { timeout: PAGE_TIMEOUT, maxRedirects: 0 })
    await saved.dispose()
    return response.status() === 200
  }
  if (!(await accepted())) await administratorSession(config, baseURL)

  const signedIn = await request.newContext({ baseURL, storageState: file })
  await ask(signedIn, baseURL, needSession, true)
  await signedIn.dispose()

  const [slowest, slowestDuration] = durations.reduce((a, b) => (b[1] > a[1] ? b : a), durations[0])
  console.log(
    `Warm-up: ${durations.length} pages answered in ${((Date.now() - started) / 1000).toFixed(1)} s ` +
      `(slowest: ${slowest}, ${(slowestDuration / 1000).toFixed(1)} s)`,
  )
}
