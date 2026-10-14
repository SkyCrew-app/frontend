import { getWeather } from "../weather"
import i18n from "@/lib/i18n"

describe("getWeather", () => {
  it("demande la description du temps dans la langue de l'interface", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    global.fetch = fetchMock as unknown as typeof fetch
    await i18n.changeLanguage("fr")

    await getWeather(48.7, 2.4)

    expect(fetchMock.mock.calls[0][0]).toContain("lang=fr")
  })
})
