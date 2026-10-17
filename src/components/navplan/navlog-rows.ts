import type { FlightPlanResult, Leg } from "@/lib/navplan/types"
import { formatCourse, formatDrift, formatNumber, formatUtcTime, formatWind } from "@/lib/navplan/units"

// The nav log as on the paper one French club pilots use: one line per point, the figures of the
// leg that leads to it, and blank boxes for what is written in flight. The screen and the printed
// log are built from these same rows and columns, so they always match.

export const NAVLOG_COLUMNS = [
  "point",
  "frequency",
  "altitude",
  "trueCourse",
  "magneticCourse",
  "wind",
  "drift",
  "magneticHeading",
  "tas",
  "groundSpeed",
  "distance",
  "time",
  "eta",
  "ata",
  "fuelRemaining",
  "fuelActual",
] as const

export type NavLogColumn = (typeof NAVLOG_COLUMNS)[number]

/** Columns left blank on purpose: the pilot fills them in flight. */
export const BLANK_COLUMNS: ReadonlySet<NavLogColumn> = new Set(["ata", "fuelActual"])

export interface NavLogRow {
  key: string
  kind: "departure" | "point" | "alternate"
  ident: string
  name?: string | null
  /** The leg flown to reach this point; none on the departure line. */
  leg?: Leg
  /** Frequency of the point (aerodrome, navaid) and of the areas to contact on the leg. */
  frequencies: string
  cumulativeDistanceNm?: number
  cumulativeTimeMin?: number
  /** Fuel on board at this point, litres. */
  fuelRemainingL?: number
}

/** Where the climb ends / the descent starts on a leg, from the phase segments of the API. */
export function legProfileNotes(leg: Leg): { toc?: number; tod?: number } {
  const climb = leg.segments.find((segment) => segment.phase === "CLIMB")
  const descent = leg.segments.find((segment) => segment.phase === "DESCENT")
  return {
    toc: climb && climb.toNm < leg.distanceNm - 0.05 ? climb.toNm : undefined,
    tod: descent && descent.fromNm > 0.05 ? descent.fromNm : undefined,
  }
}

const zonesToContact = (leg: Leg) =>
  leg.crossings
    .filter((crossing) => crossing.relation !== "ABOVE" && crossing.relation !== "BELOW")
    .map((crossing) => {
      const frequency = crossing.airspace.frequencies[0]
      return frequency ? `${crossing.airspace.name} ${frequency.mhz}` : crossing.airspace.name
    })

const joinFrequencies = (...values: (string | null | undefined)[]) => values.filter(Boolean).join(" · ")

/** Departure, then each point reached, then the alternate (its distance counted from the destination). */
export function navLogRows(result: Pick<FlightPlanResult, "legs" | "alternateLeg">): NavLogRow[] {
  const { legs, alternateLeg } = result
  if (legs.length === 0) return []
  const first = legs[0]
  const rows: NavLogRow[] = [
    {
      key: "departure",
      kind: "departure",
      ident: first.from.ident,
      name: first.from.name,
      frequencies: joinFrequencies(first.from.frequency),
      // Fuel when the first leg starts: what the API left after it, plus what it burns.
      fuelRemainingL: first.fuelRemainingL + first.fuelL,
    },
  ]
  let distance = 0
  for (const leg of legs) {
    distance += leg.distanceNm
    rows.push({
      key: `leg-${leg.index}`,
      kind: "point",
      ident: leg.to.ident,
      name: leg.to.name,
      leg,
      frequencies: joinFrequencies(leg.to.frequency, ...zonesToContact(leg)),
      cumulativeDistanceNm: distance,
      cumulativeTimeMin: leg.cumulativeTimeMin,
      fuelRemainingL: leg.fuelRemainingL,
    })
  }
  if (alternateLeg) {
    rows.push({
      key: `alternate-${alternateLeg.index}`,
      kind: "alternate",
      ident: alternateLeg.to.ident,
      name: alternateLeg.to.name,
      leg: alternateLeg,
      frequencies: joinFrequencies(alternateLeg.to.frequency, ...zonesToContact(alternateLeg)),
      cumulativeDistanceNm: alternateLeg.distanceNm,
      cumulativeTimeMin: alternateLeg.cumulativeTimeMin,
      fuelRemainingL: alternateLeg.fuelRemainingL,
    })
  }
  return rows
}

/** Text of a figure cell, without its unit (the unit is in the column heading, as on paper). */
export function navLogCell(row: NavLogRow, column: NavLogColumn, labels: { calm: string; noForecast: string }): string {
  const leg = row.leg
  switch (column) {
    case "point":
      return row.ident
    case "frequency":
      return row.frequencies
    case "fuelRemaining":
      return row.fuelRemainingL === undefined ? "" : formatNumber(row.fuelRemainingL, 0)
    case "ata":
    case "fuelActual":
      return ""
  }
  if (!leg) return ""
  switch (column) {
    case "altitude":
      return formatNumber(leg.altitudeFt, 0)
    case "trueCourse":
      return formatCourse(leg.trueCourseDeg)
    case "magneticCourse":
      return formatCourse(leg.magneticCourseDeg)
    case "wind":
      // Without a winds aloft forecast the API assumes a calm wind: said so, never shown as a forecast.
      return leg.wind.source === "NONE" ? labels.noForecast : formatWind(leg.wind, labels.calm)
    case "drift":
      return formatDrift(leg.windCorrectionDeg)
    case "magneticHeading":
      return formatCourse(leg.magneticHeadingDeg)
    case "tas":
      return formatNumber(leg.tasKt, 0)
    case "groundSpeed":
      return formatNumber(leg.groundSpeedKt, 0)
    case "distance":
      return formatNumber(leg.distanceNm, 1)
    case "time":
      return formatNumber(leg.timeMin, 0)
    case "eta":
      return formatUtcTime(leg.eta).replace("Z", "")
    default:
      return ""
  }
}

/** The running total written under the distance and the time, as "Σ 41,2". */
export function navLogCumulative(row: NavLogRow, column: NavLogColumn): string | null {
  if (row.kind === "departure") return null
  if (column === "distance" && row.cumulativeDistanceNm !== undefined) return `Σ ${formatNumber(row.cumulativeDistanceNm, 1)}`
  if (column === "time" && row.cumulativeTimeMin !== undefined) return `Σ ${formatNumber(row.cumulativeTimeMin, 0)}`
  return null
}
