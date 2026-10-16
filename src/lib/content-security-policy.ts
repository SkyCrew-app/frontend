// The Content-Security-Policy of the pages, built for each request by the
// proxy (src/proxy.ts): scripts run only when they carry the nonce of the
// request or come from the listed addresses.
import { getBackendBaseUrl, getGraphqlUrl } from "./runtime-config"
import { mapOrigins } from "@/components/map/style"

const STRIPE_SCRIPTS = ["https://js.stripe.com", "https://*.js.stripe.com"]
const STRIPE_FRAMES = [...STRIPE_SCRIPTS, "https://hooks.stripe.com", "https://m.stripe.network"]
const STRIPE_CALLS = ["https://api.stripe.com", "https://m.stripe.com", "https://r.stripe.com"]
const PAYPAL = ["https://*.paypal.com", "https://*.paypalobjects.com"]
const YOUTUBE = ["https://www.youtube.com", "https://www.youtube-nocookie.com"]
const ADDRESS_SEARCH = ["https://api-adresse.data.gouv.fr"]

const unique = (values: string[]) => [...new Set(values)]

// Origin of the API when it is not served from the address of the site
// (local development, or a split deployment), with its websocket.
const apiOrigins = () =>
  unique(
    [getGraphqlUrl(), getBackendBaseUrl()].flatMap((value) => {
      try {
        const { origin } = new URL(value)
        return [origin, origin.replace(/^http/, "ws")]
      } catch {
        // A relative address: the API is behind the address of the site.
        return []
      }
    }),
  )

// The websocket of the site itself (notifications behind a reverse proxy):
// not every browser reads it into 'self'.
const ownWebsocket = (host: string | null | undefined) =>
  host && /^[\w.-]+(?::\d+)?$/.test(host) ? [`ws://${host}`, `wss://${host}`] : []

export interface PolicyOptions {
  /** Random value of the request, carried by every script tag Next.js writes. */
  nonce: string
  /** Host header of the request. */
  host?: string | null
  isDevelopment?: boolean
}

export function contentSecurityPolicy({
  nonce,
  host,
  isDevelopment = process.env.NODE_ENV === "development",
}: PolicyOptions): string {
  const api = apiOrigins()
  // The development server evaluates code and reloads over a websocket.
  const developmentScripts = isDevelopment ? ["'unsafe-eval'"] : []
  const developmentCalls = isDevelopment ? ["ws://localhost:*", "ws://127.0.0.1:*", "http://localhost:*"] : []

  const policy: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, ...developmentScripts, ...STRIPE_SCRIPTS, ...PAYPAL],
    // Inline styles stay allowed: React style attributes, the map, the
    // charts and the component library all write them.
    "style-src": ["'self'", "'unsafe-inline'"],
    // Articles may show a picture from any https address.
    "img-src": ["'self'", "data:", "blob:", "https:", ...api.filter((origin) => origin.startsWith("http"))],
    "font-src": ["'self'", "data:"],
    "connect-src": unique([
      "'self'",
      ...ownWebsocket(host),
      ...api,
      // Base map of the flight preparation (OpenFreeMap by default): style, tiles, glyphs, sprites.
      ...mapOrigins(),
      ...STRIPE_CALLS,
      ...PAYPAL,
      ...ADDRESS_SEARCH,
      ...developmentCalls,
    ]),
    "frame-src": ["'self'", ...STRIPE_FRAMES, ...PAYPAL, ...YOUTUBE],
    // The map draws in a worker it starts from a blob.
    "worker-src": ["'self'", "blob:"],
    "child-src": ["'self'", "blob:"],
    "media-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  }

  return Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ")
}

/**
 * The offline worker fetches on behalf of the pages (map tiles, pictures of
 * articles), after their own policy has allowed the request. A page policy
 * on its script would make it refuse them a second time, under connect-src.
 */
export const isWorkerScript = (pathname: string) => pathname === "/sw.js" || /^\/swe-worker-[\w-]+\.js$/.test(pathname)

// 128 random bits, as base64.
export const createNonce = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
