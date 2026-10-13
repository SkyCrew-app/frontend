import type { BrowserContext, Page } from "@playwright/test"

// The weather of the dashboard: the API asks a provider (API Ninjas) for the member's aerodrome
// and its conditions when it has a key. The browser cannot refuse a request the API makes, so
// the three queries concerned are answered here instead: a stack that has a key (a developer's
// own, for instance) spends no quota, and the dashboard shows the same thing on every stack.
const aerodrome = (codes: { icao?: unknown; iata?: unknown }) => ({
  __typename: "Aerodrome",
  icao: codes.icao ?? null,
  iata: codes.iata ?? null,
  name: `Aérodrome ${codes.icao ?? codes.iata}`,
  latitude: 49.00896,
  longitude: 2.554117,
  timezone: "Europe/Paris",
})

const answers = (variables: Record<string, unknown>, available: boolean): Record<string, () => unknown> => ({
  AerodromeByIcao: () => ({ aerodromeByIcao: available ? aerodrome({ icao: variables.icao }) : null }),
  AerodromeByIata: () => ({ aerodromeByIata: available ? aerodrome({ iata: variables.iata }) : null }),
  WeatherAt: () => ({
    weatherAt: available
      ? {
          __typename: "AerodromeWeather",
          temperature: 14,
          feelsLike: 13,
          humidity: 62,
          cloudCover: 20,
          windSpeedKmh: 12,
          windDegrees: 240,
          sunrise: 1_760_335_200,
          sunset: 1_760_374_800,
        }
      : null,
  }),
})

/**
 * Answers the aerodrome and weather queries of the API; every other query goes to the API.
 * With `available: false` it answers as an API without a key does: nothing found.
 */
export async function stubWeather(target: BrowserContext | Page, { available = true } = {}) {
  await target.route(/\/graphql$/, async (route) => {
    const request = route.request()
    let body: { operationName?: string; variables?: Record<string, unknown> } | null = null
    try {
      body = request.method() === "POST" ? request.postDataJSON() : null
    } catch {
      // An upload (multipart): not one of ours.
    }
    const answer = body?.operationName ? answers(body.variables ?? {}, available)[body.operationName] : undefined
    if (!answer) return route.fallback()

    const origin = (await request.headerValue("origin")) ?? "*"
    return route.fulfill({
      json: { data: answer() },
      // The API may live at another address than the frontend: answer as it does.
      headers: { "access-control-allow-origin": origin, "access-control-allow-credentials": "true" },
    })
  })
}
