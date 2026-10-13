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

const permissionsPolicy = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "usb=()",
  "midi=()",
  "display-capture=()",
].join(", ");

// Headers that are the same for every answer. The Content-Security-Policy of
// the pages changes with each request (it carries a nonce): the proxy sets it,
// from src/lib/content-security-policy.ts, and replaces the one below, which
// is what files served without the proxy (/_next/...) keep.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: permissionsPolicy },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
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
  // Development server only. It forgets a page left alone for a minute and
  // keeps five of them at most, then compiles it again when it is asked for:
  // under load that takes longer than a browser journey waits. Pages are kept
  // for the length of a working session instead.
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 100,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withSerwist(nextConfig);
