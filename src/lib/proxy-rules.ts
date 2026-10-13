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
