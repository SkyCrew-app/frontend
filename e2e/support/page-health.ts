import fs from "node:fs"
import path from "node:path"
import type { Page } from "@playwright/test"
import { isLocalUrl } from "./test"

// Noise that is not a defect of the page under test.
const KNOWN_NOISE = [
  // The local stack has a placeholder PayPal key, and the suite blocks the SDK anyway.
  /PayPal JS SDK/i,
  // Stripe.js is a third-party script the suite blocks.
  /Failed to load Stripe\.js/i,
  // next-themes injects its script from a component (React 19 warning).
  /Encountered a script tag while rendering React component/i,
]

const URL_IN_TEXT = /https?:\/\/[^\s"')]+/g

// An error about a third-party resource: the suite refuses those requests itself.
const aboutThirdParty = (text: string, location: string | undefined, baseURL?: string) =>
  (!!location && !isLocalUrl(location, baseURL)) || (text.match(URL_IN_TEXT) ?? []).some((url) => !isLocalUrl(url, baseURL))

/** Records console errors and uncaught exceptions of the page, without the known noise. */
export function watchConsole(page: Page, baseURL?: string) {
  const errors: string[] = []
  const keep = (text: string, location?: string) => {
    if (KNOWN_NOISE.some((pattern) => pattern.test(text))) return
    if (aboutThirdParty(text, location, baseURL)) return
    errors.push(text)
  }
  page.on("console", (message) => {
    if (message.type() === "error") keep(message.text(), message.location().url)
  })
  page.on("pageerror", (error) => keep(`Uncaught: ${error.message}`))
  return errors
}

// First segments of the translation keys, per namespace: "pages", "sidebar", "admin"…
const localesDir = path.join(__dirname, "..", "..", "src", "locales", "fr")
const namespaces = fs.readdirSync(localesDir).filter((file) => file.endsWith(".json"))
const roots = new Set<string>()
for (const file of namespaces) {
  const content = JSON.parse(fs.readFileSync(path.join(localesDir, file), "utf8")) as Record<string, unknown>
  for (const [key, value] of Object.entries(content)) if (typeof value === "object") roots.add(key)
}
const namespaceNames = namespaces.map((file) => file.replace(/\.json$/, ""))
const RAW_KEY = new RegExp(
  `^(?:(?:${namespaceNames.join("|")}):)?(?:${[...roots].join("|")})(?:\\.[A-Za-z0-9_]+)+$`,
)

/** Words of a text that look like a translation key shown as is ("fleet:admin.toast.deleted.title"). */
export const rawTranslationKeys = (text: string) =>
  text
    .split(/\s+/)
    .map((word) => word.replace(/^[«"'(]+|[»"').,;:!?]+$/g, ""))
    .filter((word) => !word.includes("@") && RAW_KEY.test(word))
