import withSerwistInit from "@serwist/next";

const normalizeBasePath = (value) => {
  if (!value || value === "/") {
    return "";
  }

  const trimmed = value.trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
};

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const isDevelopment = process.env.NODE_ENV === "development";

// Origins of the API when it is not served from the address of the site
// (local development, or a split deployment): http(s) and its websocket.
const apiOrigins = [
  process.env.NEXT_PUBLIC_GRAPHQL_URL,
  process.env.NEXT_PUBLIC_BACKEND_URL,
  process.env.NEXT_PUBLIC_API_URL || (isDevelopment ? "http://localhost:3000" : ""),
].flatMap((value) => {
  try {
    const { origin } = new URL((value ?? "").trim());
    return [origin, origin.replace(/^http/, "ws")];
  } catch {
    return [];
  }
});
const uniqueApiOrigins = [...new Set(apiOrigins)];

const MAPBOX = ["https://api.mapbox.com", "https://events.mapbox.com", "https://*.tiles.mapbox.com"];
const STRIPE_SCRIPTS = ["https://js.stripe.com", "https://*.js.stripe.com"];
const STRIPE_FRAMES = [...STRIPE_SCRIPTS, "https://hooks.stripe.com", "https://m.stripe.network"];
const STRIPE_CALLS = ["https://api.stripe.com", "https://m.stripe.com", "https://r.stripe.com"];
const PAYPAL = ["https://*.paypal.com", "https://*.paypalobjects.com"];
const YOUTUBE = ["https://www.youtube.com", "https://www.youtube-nocookie.com"];
const AVIATION_DATA = ["https://api.openweathermap.org", "https://api.core.openaip.net"];
const ADDRESS_SEARCH = ["https://api-adresse.data.gouv.fr"];
const DEVELOPMENT_SCRIPTS = isDevelopment ? ["'unsafe-eval'"] : [];
const DEVELOPMENT_CALLS = isDevelopment ? ["ws://localhost:*", "ws://127.0.0.1:*", "http://localhost:*"] : [];

const contentSecurityPolicy = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", ...DEVELOPMENT_SCRIPTS, ...STRIPE_SCRIPTS, ...PAYPAL],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", "https:", ...uniqueApiOrigins.filter((origin) => origin.startsWith("http"))],
  "font-src": ["'self'", "data:"],
  "connect-src": [
    "'self'",
    ...uniqueApiOrigins,
    ...MAPBOX,
    ...STRIPE_CALLS,
    ...PAYPAL,
    ...AVIATION_DATA,
    ...ADDRESS_SEARCH,
    ...DEVELOPMENT_CALLS,
  ],
  "frame-src": ["'self'", ...STRIPE_FRAMES, ...PAYPAL, ...YOUTUBE],
  "worker-src": ["'self'", "blob:"],
  "child-src": ["'self'", "blob:"],
  "media-src": ["'self'", "blob:"],
  "manifest-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
};

const serializePolicy = (policy) =>
  Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");

const permissionsPolicy = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "usb=()",
  "midi=()",
  "display-capture=()",
].join(", ");

// The full policy is only reported for now: it has to be checked in a
// browser on every screen (map, payments, lesson videos) before it is
// enforced by renaming the header to Content-Security-Policy. Framing is
// refused right away.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: permissionsPolicy },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Content-Security-Policy-Report-Only", value: serializePolicy(contentSecurityPolicy) },
  // Browsers ignore it over plain HTTP; never sent by the development server.
  ...(isDevelopment ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server for the container image.
  output: "standalone",
  basePath,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withSerwist(nextConfig);
