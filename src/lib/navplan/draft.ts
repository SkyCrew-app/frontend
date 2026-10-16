import { emptyRoute, routeFromSaved, toLegInputs, toRoutePointInput, type RouteDraft } from "./route"
import type {
  AircraftMassBalance,
  AircraftPerformance,
  EnvelopeCategory,
  FlightPlan,
  FlightPlanInput,
  ReserveCase,
} from "./types"

// Everything the pilot enters in the builder. The API computes; this only gathers and checks
// what is needed before asking it (design § 2.1).

export interface FlightPlanDraft {
  aircraftId: number | null
  reservationId: number | null
  /** Off-block time, ISO UTC. */
  departureTime: string
  route: RouteDraft
  reserveCase: ReserveCase
  /** null → QNH of the departure METAR (the API says so in a notice). */
  qnhHpa: number | null
  /** Mass per station id (seats, baggage, other), kg. */
  loads: Record<string, number | null>
  /** Litres per tank id. */
  fuel: Record<string, number | null>
  envelopeCategory: EnvelopeCategory
  extraFuelNote: string
}

export const emptyDraft = (partial: Partial<FlightPlanDraft> = {}): FlightPlanDraft => ({
  aircraftId: null,
  reservationId: null,
  departureTime: new Date().toISOString(),
  route: emptyRoute(),
  reserveCase: "VFR_DAY",
  qnhHpa: null,
  loads: {},
  fuel: {},
  envelopeCategory: "NORMAL",
  extraFuelNote: "",
  ...partial,
})

export type DraftIssueCode =
  | "AIRCRAFT_MISSING"
  | "DEPARTURE_MISSING"
  | "DESTINATION_MISSING"
  | "DEPARTURE_TIME_INVALID"
  | "ALTITUDE_INVALID"
  | "QNH_INVALID"
  | "LOAD_INVALID"
  | "FUEL_INVALID"
  | "FUEL_MISSING"
  | "MASS_BALANCE_NOT_VALIDATED"
  | "PERFORMANCE_NOT_VALIDATED"

export interface DraftIssue {
  code: DraftIssueCode
  /** Blocking issues stop the computation; the others are only shown. */
  blocking: boolean
  /** Leg index, station id or tank id the issue is about. */
  target?: string | number
}

export const MAX_ALTITUDE_FT = 19500
export const QNH_RANGE = { min: 940, max: 1060 }

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)

export function draftIssues(
  draft: FlightPlanDraft,
  aircraft?: { performance?: AircraftPerformance | null; massBalance?: AircraftMassBalance | null },
): DraftIssue[] {
  const issues: DraftIssue[] = []
  if (draft.aircraftId === null) issues.push({ code: "AIRCRAFT_MISSING", blocking: true })
  if (!draft.route.departure) issues.push({ code: "DEPARTURE_MISSING", blocking: true })
  if (!draft.route.destination) issues.push({ code: "DESTINATION_MISSING", blocking: true })
  if (Number.isNaN(new Date(draft.departureTime).getTime())) issues.push({ code: "DEPARTURE_TIME_INVALID", blocking: true })

  draft.route.legs.forEach((leg, index) => {
    if (!isFiniteNumber(leg.altitudeFt) || leg.altitudeFt < 0 || leg.altitudeFt > MAX_ALTITUDE_FT) {
      issues.push({ code: "ALTITUDE_INVALID", blocking: true, target: index })
    }
  })

  if (draft.qnhHpa !== null && (!isFiniteNumber(draft.qnhHpa) || draft.qnhHpa < QNH_RANGE.min || draft.qnhHpa > QNH_RANGE.max)) {
    issues.push({ code: "QNH_INVALID", blocking: true })
  }

  Object.entries(draft.loads).forEach(([stationId, mass]) => {
    if (mass !== null && (!isFiniteNumber(mass) || mass < 0 || mass > 1000)) {
      issues.push({ code: "LOAD_INVALID", blocking: true, target: stationId })
    }
  })

  const fuelEntries = Object.entries(draft.fuel)
  fuelEntries.forEach(([tankId, litres]) => {
    if (litres !== null && (!isFiniteNumber(litres) || litres < 0)) {
      issues.push({ code: "FUEL_INVALID", blocking: true, target: tankId })
    }
  })
  if (!fuelEntries.some(([, litres]) => isFiniteNumber(litres) && litres > 0)) {
    issues.push({ code: "FUEL_MISSING", blocking: false })
  }

  if (aircraft && !aircraft.massBalance?.validatedAt) issues.push({ code: "MASS_BALANCE_NOT_VALIDATED", blocking: false })
  if (aircraft && !aircraft.performance?.validatedAt) issues.push({ code: "PERFORMANCE_NOT_VALIDATED", blocking: false })

  return issues
}

export const isComputable = (issues: DraftIssue[]) => !issues.some((issue) => issue.blocking)

/** The input of computeFlightPlan / saveFlightPlan, or null while something blocking is missing. */
export function toFlightPlanInput(draft: FlightPlanDraft): FlightPlanInput | null {
  if (!isComputable(draftIssues(draft))) return null
  const { route } = draft
  if (!route.departure || !route.destination || draft.aircraftId === null) return null

  return {
    aircraftId: draft.aircraftId,
    reservationId: draft.reservationId,
    departureTime: new Date(draft.departureTime).toISOString(),
    departure: toRoutePointInput(route.departure),
    destination: toRoutePointInput(route.destination),
    alternate: route.alternate ? toRoutePointInput(route.alternate) : null,
    waypoints: route.waypoints.map(toRoutePointInput),
    legs: toLegInputs(route),
    reserveCase: draft.reserveCase,
    qnhHpa: draft.qnhHpa,
    loads: Object.entries(draft.loads)
      .filter(([, mass]) => isFiniteNumber(mass) && mass > 0)
      .map(([stationId, massKg]) => ({ stationId, massKg })),
    fuel: Object.entries(draft.fuel)
      .filter(([, litres]) => isFiniteNumber(litres) && litres > 0)
      .map(([tankId, liters]) => ({ tankId, liters: liters as number })),
    envelopeCategory: draft.envelopeCategory,
    extraFuelNote: draft.extraFuelNote.trim() || null,
  }
}

/** Fills the load fields from what the aircraft declares: one entry per station and per tank. */
export function withAircraftStations(
  draft: FlightPlanDraft,
  massBalance: AircraftMassBalance | null | undefined,
  performance: AircraftPerformance | null | undefined,
): FlightPlanDraft {
  const loads: Record<string, number | null> = {}
  for (const station of massBalance?.stations ?? []) {
    if (station.kind !== "FUEL") loads[station.id] = draft.loads[station.id] ?? null
  }
  const fuel: Record<string, number | null> = {}
  for (const tank of performance?.fuel.tanks ?? []) fuel[tank.id] = draft.fuel[tank.id] ?? null
  return { ...draft, loads, fuel }
}

/** Datetime-local value ("2026-10-16T14:30") of an ISO instant, in the browser's time zone. */
export const toLocalInputValue = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const fromLocalInputValue = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString()
}

/** The builder state of a saved plan, to change it. */
export function draftFromPlan(plan: FlightPlan): FlightPlanDraft {
  const input = plan.input
  return emptyDraft({
    aircraftId: input.aircraftId,
    reservationId: input.reservationId ?? null,
    departureTime: input.departureTime,
    route: routeFromSaved(input, plan.result.legs, plan.result.alternateLeg),
    reserveCase: input.reserveCase,
    qnhHpa: input.qnhHpa ?? null,
    loads: Object.fromEntries(input.loads.map((load) => [load.stationId, load.massKg ?? null])),
    fuel: Object.fromEntries(input.fuel.map((tank) => [tank.tankId, tank.liters])),
    envelopeCategory: input.envelopeCategory,
    extraFuelNote: input.extraFuelNote ?? "",
  })
}

