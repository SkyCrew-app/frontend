/** @jest-environment node */
import { contentSecurityPolicy, createNonce, isWorkerScript } from "../content-security-policy"

const ENV = { ...process.env }

const directives = (policy: string) =>
  Object.fromEntries(
    policy.split("; ").map((directive) => {
      const [name, ...sources] = directive.split(" ")
      return [name, sources]
    }),
  ) as Record<string, string[]>

describe("contentSecurityPolicy", () => {
  beforeEach(() => {
    process.env = { ...ENV }
    delete process.env.NEXT_PUBLIC_API_URL
    process.env.NEXT_PUBLIC_GRAPHQL_URL = "/graphql"
    process.env.NEXT_PUBLIC_BACKEND_URL = "/"
  })

  afterAll(() => {
    process.env = ENV
  })

  it("lets scripts run through the nonce only, never through 'unsafe-inline' or eval", () => {
    const policy = directives(contentSecurityPolicy({ nonce: "abc", isDevelopment: false }))

    expect(policy["script-src"]).toContain("'nonce-abc'")
    expect(policy["script-src"]).not.toContain("'unsafe-inline'")
    expect(policy["script-src"]).not.toContain("'unsafe-eval'")
    expect(policy["script-src"]).not.toContain("'strict-dynamic'")
    expect(policy["object-src"]).toEqual(["'none'"])
    expect(policy["frame-ancestors"]).toEqual(["'none'"])
    expect(policy["base-uri"]).toEqual(["'self'"])
  })

  it("adds no API origin when the API is behind the address of the site, but names its websocket", () => {
    const policy = directives(contentSecurityPolicy({ nonce: "abc", host: "club.example.com", isDevelopment: false }))

    expect(policy["connect-src"]).toEqual(expect.arrayContaining(["'self'", "ws://club.example.com", "wss://club.example.com"]))
    expect(policy["connect-src"].some((source) => source.includes("localhost"))).toBe(false)
    expect(policy["img-src"]).toEqual(["'self'", "data:", "blob:", "https:"])
  })

  it("allows the API, its files and its websocket when it lives at another address", () => {
    delete process.env.NEXT_PUBLIC_GRAPHQL_URL
    delete process.env.NEXT_PUBLIC_BACKEND_URL
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/graphql"

    const policy = directives(contentSecurityPolicy({ nonce: "abc", isDevelopment: false }))

    expect(policy["connect-src"]).toEqual(expect.arrayContaining(["https://api.example.com", "wss://api.example.com"]))
    expect(policy["img-src"]).toContain("https://api.example.com")
    expect(policy["img-src"]).not.toContain("wss://api.example.com")
  })

  it("keeps the development server working: evaluated code and the reload websocket", () => {
    const policy = directives(contentSecurityPolicy({ nonce: "abc", isDevelopment: true }))

    expect(policy["script-src"]).toContain("'unsafe-eval'")
    expect(policy["connect-src"]).toEqual(expect.arrayContaining(["ws://localhost:*", "http://localhost:*"]))
  })

  it("ignores a Host header that is not a host", () => {
    const policy = contentSecurityPolicy({ nonce: "abc", host: "evil.example; script-src *", isDevelopment: false })

    expect(policy).not.toContain("evil.example")
  })
})

describe("isWorkerScript", () => {
  it.each(["/sw.js", "/swe-worker-5c72df51bb1f6ee0.js"])("recognises %s", (pathname) => {
    expect(isWorkerScript(pathname)).toBe(true)
  })

  it.each(["/", "/dashboard", "/sw.js/other", "/articles/sw.js"])("treats %s as a page", (pathname) => {
    expect(isWorkerScript(pathname)).toBe(false)
  })
})

describe("createNonce", () => {
  it("gives a new value each time, usable in a header", () => {
    const first = createNonce()

    expect(first).toMatch(/^[A-Za-z0-9+/=]+$/)
    expect(createNonce()).not.toBe(first)
  })
})
