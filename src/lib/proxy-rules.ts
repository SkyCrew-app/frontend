// Decisions of the proxy (src/proxy.ts) that do not need a request.

/**
 * Files Next serves itself (bundles, optimised images, development tools).
 * Only that prefix skips the session check: a page whose address merely
 * contains "/static" is a page like any other.
 */
export const isNextAsset = (pathname: string) => pathname.startsWith("/_next/")

/**
 * Files of public/ and the icon of the site: the same for everyone, served
 * without a session (the browser asks for the manifest, the icons and the
 * offline worker from the sign-in page). Exact names and one folder of
 * pictures: no page lives under these addresses. Keep in line with public/
 * (the test of this file reads the folder).
 */
const PUBLIC_FILES = new Set(["/favicon.ico", "/manifest.json", "/placeholder.svg", "/robots.txt", "/sw.js"])
const PUBLIC_FILE_PATTERNS = [/^\/swe-worker-[\w-]+\.js$/, /^\/images\/[\w.-]+\.(?:png|svg|jpe?g|webp|gif|ico)$/]

export const isPublicFile = (pathname: string) =>
  PUBLIC_FILES.has(pathname) || PUBLIC_FILE_PATTERNS.some((pattern) => pattern.test(pathname))

/**
 * Seconds left before a session token expires; 0 for a token that is expired
 * or has no expiry.
 */
export const secondsLeft = (expiresAt: unknown, now: number = Date.now()): number => {
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) return 0
  return Math.max(0, Math.floor(expiresAt - now / 1000))
}

// Role names as the API returns them (and as the session token carries them).
const ADMINISTRATOR = "Administrateur"
const INSTRUCTOR = "Instructeur"
const TECHNICIAN = "Technicien"

const EVERY_MEMBER = "*"

/**
 * The administration section belongs to administrators, except the pages the
 * club's access rules give to other roles. A page that is not listed here, the
 * action log (/administration/actions) for instance, is for administrators only. One list for the proxy, the menu
 * and the command palette; the API applies the same rules to the data itself.
 */
const ADMINISTRATION_PAGES_FOR_OTHERS: Record<string, readonly string[]> = {
  // Every member sets up their own two-factor authentication there.
  "/administration/2fa": [EVERY_MEMBER],
  // Checklist templates are managed by instructors and technicians too.
  "/administration/checklists": [INSTRUCTOR, TECHNICIAN],
  // Technicians follow up the incidents.
  "/administration/incidents": [TECHNICIAN],
}

const isWithin = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`)

/** Whether a member holding `role` may open the page at `pathname` (without base path). */
export const canOpenPage = (role: string | null | undefined, pathname: string): boolean => {
  if (!isWithin(pathname, "/administration")) return true
  if (role === ADMINISTRATOR) return true

  for (const [path, roles] of Object.entries(ADMINISTRATION_PAGES_FOR_OTHERS)) {
    if (isWithin(pathname, path)) {
      return roles.includes(EVERY_MEMBER) || (!!role && roles.includes(role))
    }
  }
  return false
}
