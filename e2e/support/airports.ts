import type { BrowserContext } from "@playwright/test"

// The airport picker asks openAIP, a third party the suite does not reach: it is
// answered here with the two aerodromes of the journey, in openAIP's own format.
const AIRPORTS = [
  {
    _id: "e2e-lfpg",
    name: "PARIS CHARLES DE GAULLE",
    icaoCode: "LFPG",
    cityName: "Paris",
    countryCode: "FR",
    geometry: { type: "Point", coordinates: [2.554117, 49.00896] },
    type: 3,
  },
  {
    _id: "e2e-lfpo",
    name: "PARIS ORLY",
    icaoCode: "LFPO",
    cityName: "Paris",
    countryCode: "FR",
    geometry: { type: "Point", coordinates: [2.358963, 48.729499] },
    type: 3,
  },
]

export async function stubAirportSearch(context: BrowserContext) {
  await context.route("https://api.core.openaip.net/api/airports?**", (route) => {
    const search = (new URL(route.request().url()).searchParams.get("search") ?? "").toUpperCase()
    return route.fulfill({
      json: { items: AIRPORTS.filter((airport) => airport.icaoCode.includes(search) || airport.name.includes(search)) },
      headers: { "access-control-allow-origin": "*" },
    })
  })
}
