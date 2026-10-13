// Decisions of the proxy (src/proxy.ts) that do not need a request.

/**
 * Files Next serves itself (bundles, optimised images, development tools).
 * Only that prefix skips the session check: a page whose address merely
 * contains "/static" is a page like any other.
 */
export const isNextAsset = (pathname: string) => pathname.startsWith("/_next/")

/**
 * Lifetime, in seconds, of the session cookie the proxy sends back: what is
 * left of the token it carries, so the cookie never outlives nor cuts short
 * the session. 0 for a token that is expired or has no expiry.
 */
export const sessionCookieMaxAge = (expiresAt: unknown, now: number = Date.now()): number => {
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
 * club's access rules give to other roles. One list for the proxy, the menu
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
