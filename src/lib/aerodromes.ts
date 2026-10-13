import type { ApolloClient } from "@apollo/client"
import { AERODROME_BY_IATA, AERODROME_BY_ICAO } from "@/graphql/aviation"

export interface AerodromeSummary {
  icao?: string | null
  iata?: string | null
  name: string
  latitude?: number | null
  longitude?: number | null
}

const ICAO = /^[A-Za-z]{4}$/
const IATA = /^[A-Za-z]{3}$/

// What the search accepts: the API refuses anything else.
export const isAerodromeQuery = (query: string) => /^[\p{L}\p{N} .'’-]{2,50}$/u.test(query.trim())

// "Charles de Gaulle (CDG)", as the aerodrome picker shows it.
export const aerodromeLabel = (aerodrome: AerodromeSummary) =>
  `${aerodrome.name} (${aerodrome.iata || aerodrome.icao || "—"})`

// The aerodrome behind a stored code (ICAO, or IATA for older profiles),
// null when the code is neither or is unknown.
export async function findAerodromeByCode(
  client: ApolloClient<object>,
  code: string,
): Promise<AerodromeSummary | null> {
  const value = code.trim()

  if (ICAO.test(value)) {
    const { data } = await client.query<{ aerodromeByIcao: AerodromeSummary | null }>({
      query: AERODROME_BY_ICAO,
      variables: { icao: value.toUpperCase() },
    })
    return data?.aerodromeByIcao ?? null
  }

  if (IATA.test(value)) {
    const { data } = await client.query<{ aerodromeByIata: AerodromeSummary | null }>({
      query: AERODROME_BY_IATA,
      variables: { iata: value.toUpperCase() },
    })
    return data?.aerodromeByIata ?? null
  }

  return null
}
