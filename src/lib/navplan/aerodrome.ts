import type { NavPoint, RadioFrequency } from "./types"

/**
 * How a point is written on the log and the route: a VFR reporting point with its aerodrome
 * ("LFPN S", never a bare "S": 66 points of AIRAC 2610 are "S"), anything else by its identifier.
 */
export const pointLabel = (point: Pick<NavPoint, "type" | "ident"> & { aerodromeIcao?: string | null }) =>
  point.type === "VRP" && point.aerodromeIcao ? `${point.aerodromeIcao} ${point.ident}` : point.ident

/** Statuses a pilot must notice before choosing an aerodrome. */
export const isLimitedUse = (status: string | null | undefined) => status === "RST" || status === "PRV" || status === "MIL" || status === "OFF" || status === "closed"

// Order of the services on the sheet: what is heard before taxiing first, then the circuit, then
// the units around. VDF (direction finding) is not a frequency to call.
const SERVICE_ORDER = ["ATIS", "D-ATIS", "DEL", "GND", "TWR", "AFIS", "A/A", "APP", "FIS"]

export interface ServiceFrequencies {
  service: string
  callsign: string | null
  frequencies: RadioFrequency[]
}

/** The frequencies of an aerodrome by service and call sign, in the order a pilot uses them. */
export function frequenciesByService(frequencies: RadioFrequency[]): ServiceFrequencies[] {
  const groups = new Map<string, ServiceFrequencies>()
  for (const frequency of frequencies) {
    if (frequency.service === "VDF") continue
    const key = `${frequency.service}|${frequency.callsign ?? ""}`
    const group = groups.get(key) ?? { service: frequency.service, callsign: frequency.callsign ?? null, frequencies: [] }
    if (!group.frequencies.some((known) => known.mhz === frequency.mhz)) group.frequencies.push(frequency)
    groups.set(key, group)
  }
  const rank = (service: string) => {
    const index = SERVICE_ORDER.indexOf(service)
    return index === -1 ? SERVICE_ORDER.length : index
  }
  return [...groups.values()].sort((a, b) => rank(a.service) - rank(b.service))
}

/** A distance in metres as a pilot writes it: "1 050 m". */
export const metres = (value: number | null | undefined, locale?: string) =>
  typeof value === "number" ? `${new Intl.NumberFormat(locale).format(Math.round(value))} m` : "—"
