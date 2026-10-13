import i18n from "@/lib/i18n"
import { saveLanguage, syncStoredLanguage } from "@/lib/stored-language"

const answer = (body: unknown, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) })

describe("stored language", () => {
  const originalFetch = global.fetch
  let fetchMock: jest.Mock

  const sent = (call = 0) => {
    const [url, init] = fetchMock.mock.calls[call]
    return { url, init, body: JSON.parse(init.body) }
  }

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(async () => {
    global.fetch = originalFetch
    await i18n.changeLanguage("fr")
  })

  describe("saveLanguage", () => {
    it("stores the language with a request that outlives the page reload", async () => {
      fetchMock.mockReturnValue(answer({ data: { updateMyLanguage: { id: 3, language: "en" } } }))

      await expect(saveLanguage("en")).resolves.toBe(true)

      const { url, init, body } = sent()
      expect(url).toMatch(/\/graphql$/)
      expect(init.method).toBe("POST")
      expect(init.keepalive).toBe(true)
      expect(init.credentials).toBe("include")
      expect(init.headers["Accept-Language"]).toBe("en")
      expect(body.query).toContain("updateMyLanguage(language: $language)")
      expect(body.variables).toEqual({ language: "en" })
    })

    it("stays silent when the member is not signed in", async () => {
      fetchMock.mockReturnValue(answer({ data: null, errors: [{ message: "Unauthorized" }] }))

      await expect(saveLanguage("en")).resolves.toBe(false)
    })

    it("stays silent when the API cannot be reached", async () => {
      fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))
      await expect(saveLanguage("en")).resolves.toBe(false)

      fetchMock.mockReturnValue(answer({}, false))
      await expect(saveLanguage("en")).resolves.toBe(false)
    })

    it("does nothing where fetch does not exist", async () => {
      global.fetch = undefined as unknown as typeof fetch

      await expect(saveLanguage("en")).resolves.toBe(false)
    })
  })

  describe("syncStoredLanguage", () => {
    it("stores the interface language when the stored one differs", async () => {
      await i18n.changeLanguage("en")
      fetchMock
        .mockReturnValueOnce(answer({ data: { me: { id: 3, language: "fr" } } }))
        .mockReturnValueOnce(answer({ data: { updateMyLanguage: { id: 3, language: "en" } } }))

      await syncStoredLanguage()

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(sent(0).body.query).toContain("me {")
      expect(sent(1).body.variables).toEqual({ language: "en" })
    })

    it("stores nothing when both already agree", async () => {
      fetchMock.mockReturnValue(answer({ data: { me: { id: 3, language: "fr" } } }))

      await syncStoredLanguage()

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("stores nothing without a session", async () => {
      fetchMock.mockReturnValue(answer({ data: null, errors: [{ message: "Unauthorized" }] }))

      await syncStoredLanguage()

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("never throws when the API cannot be reached", async () => {
      fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))

      await expect(syncStoredLanguage()).resolves.toBeUndefined()
    })
  })
})
