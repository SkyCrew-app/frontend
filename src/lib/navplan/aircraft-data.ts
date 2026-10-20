import { polygonIssues } from "./envelope"
import type {
  AircraftMassBalance,
  AircraftMassBalanceInput,
  AircraftPerformance,
  AircraftPerformanceInput,
  FlightPlanningSettings,
  FuelType,
  RunwayDistanceTable,
} from "./types"

// Editor state of the aircraft data, and the checks shown to the administrator before saving.
// The API validates again on save (design § 2.4, § 2.5).

export const FUEL_DENSITY: Record<FuelType, number> = {
  AVGAS_100LL: 0.72,
  UL91: 0.72,
  JET_A1: 0.8,
  MOGAS: 0.73,
}

export const DEFAULT_TAXI_FUEL_L = 3
export const DEFAULT_DESCENT_RATE_FPM = 500

// Values of AMC1 NCO.OP.125(b): a club may only raise them (design § 2.6).
export const AMC_RESERVES = { reserveVfrDayLocalMin: 10, reserveVfrDayMin: 30, reserveVfrNightMin: 45 } as const

export const DEFAULT_SETTINGS: FlightPlanningSettings = {
  ...AMC_RESERVES,
  contingencyPercent: 0,
  contingencyMinL: 0,
  alternateRequiredVfr: false,
  clubMarginMin: 0,
  verticalMarginFt: 300,
  defaultCircuitHeightFt: 1000,
  msaCorridorNm: 5,
  msaMarginFt: 1000,
  // UK CAA Safety Sense Leaflet 7 "Aeroplane Performance".
  takeoffSafetyFactor: 1.33,
  landingSafetyFactor: 1.43,
}

/** Drops __typename and the read-only fields Apollo returns, keeping only the input fields. */
const clean = <T>(value: T): T => JSON.parse(JSON.stringify(value, (key, item) => (key === "__typename" ? undefined : item)))

export function emptyPerformanceInput(fuelCapacityL?: number | null, tankLabel = "Main"): AircraftPerformanceInput {
  return {
    fuel: {
      type: "AVGAS_100LL",
      densityKgPerL: FUEL_DENSITY.AVGAS_100LL,
      tanks: [{ id: "main", label: tankLabel, usableL: fuelCapacityL ?? 0, unusableL: 0, armM: 0 }],
      taxiFuelL: DEFAULT_TAXI_FUEL_L,
      burnOrder: [],
    },
    climb: { iasKt: 0, table: null, seaLevelRateFpm: null, ceilingRateFpm: null, fuelFlowLph: null },
    cruise: { normalSetting: "", rows: [] },
    descent: { iasKt: 0, rateFpm: DEFAULT_DESCENT_RATE_FPM, fuelFlowLph: 0 },
    reserve: { holdingFuelFlowLph: 0, maxContinuousFuelFlowLph: 0 },
    arrivalFuelL: 0,
    serviceCeilingFt: null,
    calibration: [],
    takeoff: null,
    landing: null,
    source: "",
  }
}

/** A distance table to fill in: no row, no correction (the generic factors apply until entered). */
export const emptyDistanceTable = (): RunwayDistanceTable => ({
  rows: [],
  referenceMassKg: null,
  speedKt: null,
  headwindPercentPerKt: null,
  tailwindPercentPerKt: null,
  grassPercent: null,
  wetGrassPercent: null,
  slopePercentPerPercent: null,
  source: "",
})

export function performanceInput(
  performance: AircraftPerformance | null | undefined,
  fuelCapacityL?: number | null,
  tankLabel?: string,
): AircraftPerformanceInput {
  if (!performance) return emptyPerformanceInput(fuelCapacityL, tankLabel)
  const { fuel, climb, cruise, descent, reserve, arrivalFuelL, serviceCeilingFt, calibration, takeoff, landing, source } = clean(performance)
  return {
    fuel,
    climb,
    cruise,
    descent,
    reserve,
    arrivalFuelL,
    serviceCeilingFt: serviceCeilingFt ?? null,
    calibration,
    takeoff: takeoff ?? null,
    landing: landing ?? null,
    source: source ?? "",
  }
}

export function emptyMassBalanceInput(emptyMassKg?: number | null, mtowKg?: number | null): AircraftMassBalanceInput {
  return {
    emptyMassKg: emptyMassKg ?? 0,
    // Unknown until weighed: an empty field, never a lever arm of 0.
    emptyArmM: Number.NaN,
    weighingDate: "",
    weighingRef: "",
    mtowKg: mtowKg ?? 0,
    mlwKg: mtowKg ?? 0,
    mzfwKg: null,
    stations: [],
    combinedLimits: [],
    envelopes: [{ category: "NORMAL", points: [] }],
  }
}

export function massBalanceInput(massBalance: AircraftMassBalance | null | undefined): AircraftMassBalanceInput {
  if (!massBalance) return emptyMassBalanceInput()
  const value = clean(massBalance)
  return {
    emptyMassKg: value.emptyMassKg ?? 0,
    emptyArmM: value.emptyArmM ?? Number.NaN,
    weighingDate: value.weighingDate ? value.weighingDate.slice(0, 10) : "",
    weighingRef: value.weighingRef ?? "",
    mtowKg: value.mtowKg ?? 0,
    mlwKg: value.mlwKg ?? value.mtowKg ?? 0,
    mzfwKg: value.mzfwKg ?? null,
    stations: value.stations,
    combinedLimits: value.combinedLimits,
    envelopes: value.envelopes.length > 0 ? value.envelopes : [{ category: "NORMAL", points: [] }],
  }
}

/** The input sent to the API: the date as an instant, empty texts as null. */
export const massBalanceForSave = (input: AircraftMassBalanceInput): AircraftMassBalanceInput => ({
  ...input,
  weighingDate: input.weighingDate ? new Date(`${input.weighingDate.slice(0, 10)}T00:00:00.000Z`).toISOString() : "",
  weighingRef: input.weighingRef?.trim() || null,
})

/** A table without a row is no table; an empty source is none. */
const distanceTableForSave = (table: RunwayDistanceTable | null | undefined): RunwayDistanceTable | null =>
  table && table.rows.length > 0
    ? { ...table, rows: table.rows.map((row) => ({ ...row, massKg: row.massKg ?? null })), source: table.source?.trim() || null }
    : null

export const performanceForSave = (input: AircraftPerformanceInput): AircraftPerformanceInput => ({
  ...input,
  source: input.source?.trim() || null,
  takeoff: distanceTableForSave(input.takeoff),
  landing: distanceTableForSave(input.landing),
  climb: {
    ...input.climb,
    table: input.climb.table && input.climb.table.length > 0 ? input.climb.table : null,
  },
})

/** Stable id for a new station or tank, from its label: "Siège arrière" → "siege-arriere-2". */
export function makeId(label: string, taken: string[]): string {
  const base =
    label
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "item"
  let id = base
  let index = 2
  while (taken.includes(id)) id = `${base}-${index++}`
  return id
}

export type MassBalanceProblem =
  | "EMPTY_MASS"
  | "EMPTY_ARM"
  | "WEIGHING_DATE"
  | "MTOW"
  | "MLW"
  | "MLW_ABOVE_MTOW"
  | "STATION_LABEL"
  | "STATION_DUPLICATE"
  | "STATION_TANK"
  | "COMBINED_LIMIT"
  | "ENVELOPE"

export interface Problem<Code extends string> {
  code: Code
  /** Station id, envelope index… */
  target?: string | number
  detail?: string
}

export function massBalanceProblems(input: AircraftMassBalanceInput, tankIds: string[] = []): Problem<MassBalanceProblem>[] {
  const problems: Problem<MassBalanceProblem>[] = []
  if (!(input.emptyMassKg > 0)) problems.push({ code: "EMPTY_MASS" })
  if (!Number.isFinite(input.emptyArmM)) problems.push({ code: "EMPTY_ARM" })
  if (!input.weighingDate) problems.push({ code: "WEIGHING_DATE" })
  if (!(input.mtowKg > 0)) problems.push({ code: "MTOW" })
  if (!(input.mlwKg > 0)) problems.push({ code: "MLW" })
  else if (input.mtowKg > 0 && input.mlwKg > input.mtowKg) problems.push({ code: "MLW_ABOVE_MTOW" })
  const seen = new Set<string>()
  for (const station of input.stations) {
    if (!station.label.trim()) problems.push({ code: "STATION_LABEL", target: station.id })
    if (seen.has(station.id)) problems.push({ code: "STATION_DUPLICATE", target: station.id })
    seen.add(station.id)
    if (station.kind === "FUEL" && (!station.tankId || (tankIds.length > 0 && !tankIds.includes(station.tankId)))) {
      problems.push({ code: "STATION_TANK", target: station.id })
    }
  }
  input.combinedLimits.forEach((limit, index) => {
    if (limit.stationIds.length < 2 || !(limit.maxKg > 0)) problems.push({ code: "COMBINED_LIMIT", target: index })
  })
  input.envelopes.forEach((envelope, index) => {
    const issues = polygonIssues(envelope.points)
    if (issues.length > 0) problems.push({ code: "ENVELOPE", target: index, detail: issues[0] })
  })
  return problems
}

export type PerformanceProblem =
  | "TANKS"
  | "DENSITY"
  | "CLIMB"
  | "CRUISE"
  | "NORMAL_SETTING"
  | "DESCENT"
  | "RESERVE"
  | "TAKEOFF_TABLE"
  | "LANDING_TABLE"

export function performanceProblems(input: AircraftPerformanceInput): Problem<PerformanceProblem>[] {
  const problems: Problem<PerformanceProblem>[] = []
  if (input.fuel.tanks.length === 0 || input.fuel.tanks.some((tank) => !(tank.usableL > 0) || !tank.label.trim())) {
    problems.push({ code: "TANKS" })
  }
  if (!(input.fuel.densityKgPerL > 0.5 && input.fuel.densityKgPerL < 1)) problems.push({ code: "DENSITY" })
  const table = input.climb.table ?? []
  const simple = (input.climb.seaLevelRateFpm ?? 0) > 0 && (input.climb.fuelFlowLph ?? 0) > 0
  if (!(input.climb.iasKt > 0) || (table.length < 2 && !simple)) problems.push({ code: "CLIMB" })
  if (input.cruise.rows.length === 0 || input.cruise.rows.some((row) => !(row.tasKt > 0) || !(row.fuelFlowLph > 0) || !row.setting.trim())) {
    problems.push({ code: "CRUISE" })
  }
  if (!input.cruise.rows.some((row) => row.setting === input.cruise.normalSetting)) problems.push({ code: "NORMAL_SETTING" })
  if (!(input.descent.iasKt > 0) || !(input.descent.rateFpm > 0) || !(input.descent.fuelFlowLph > 0)) problems.push({ code: "DESCENT" })
  if (!(input.reserve.holdingFuelFlowLph > 0) || !(input.reserve.maxContinuousFuelFlowLph > 0)) problems.push({ code: "RESERVE" })
  if (distanceTableIssues(input.takeoff).length > 0) problems.push({ code: "TAKEOFF_TABLE", detail: distanceTableIssues(input.takeoff)[0] })
  if (distanceTableIssues(input.landing).length > 0) problems.push({ code: "LANDING_TABLE", detail: distanceTableIssues(input.landing)[0] })
  return problems
}

export type DistanceTableIssue = "VALUES" | "SHORTER_THAN_ROLL" | "DUPLICATE" | "MASS"

/** What the API would refuse in a take-off or landing table (rows are checked as entered). */
export function distanceTableIssues(table: RunwayDistanceTable | null | undefined): DistanceTableIssue[] {
  if (!table || table.rows.length === 0) return []
  const issues: DistanceTableIssue[] = []
  const finite = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value)
  if (table.rows.some((row) => !finite(row.pressureAltFt) || !finite(row.temperatureC) || !(row.groundRollM > 0) || !(row.distance15mM > 0))) issues.push("VALUES")
  if (table.rows.some((row) => row.distance15mM < row.groundRollM)) issues.push("SHORTER_THAN_ROLL")
  const keys = table.rows.map((row) => `${row.pressureAltFt}|${row.temperatureC}|${row.massKg ?? ""}`)
  if (new Set(keys).size !== keys.length) issues.push("DUPLICATE")
  const withMass = table.rows.filter((row) => row.massKg != null).length
  if (withMass > 0 && withMass < table.rows.length && table.referenceMassKg == null) issues.push("MASS")
  return issues
}

export type SettingsProblem =
  | keyof typeof AMC_RESERVES
  | "contingencyPercent"
  | "contingencyMinL"
  | "clubMarginMin"
  | "verticalMarginFt"
  | "defaultCircuitHeightFt"
  | "msaCorridorNm"
  | "msaMarginFt"
  | "takeoffSafetyFactor"
  | "landingSafetyFactor"

/** Club settings may only be stricter than the AMC (the API refuses lower values too). */
export function settingsProblems(settings: FlightPlanningSettings): SettingsProblem[] {
  const problems: SettingsProblem[] = []
  for (const key of Object.keys(AMC_RESERVES) as (keyof typeof AMC_RESERVES)[]) {
    if (!Number.isInteger(settings[key]) || settings[key] < AMC_RESERVES[key]) problems.push(key)
  }
  if (!(settings.contingencyPercent >= 0 && settings.contingencyPercent <= 100)) problems.push("contingencyPercent")
  if (!(settings.contingencyMinL >= 0)) problems.push("contingencyMinL")
  if (!(Number.isInteger(settings.clubMarginMin) && settings.clubMarginMin >= 0)) problems.push("clubMarginMin")
  if (!(Number.isInteger(settings.verticalMarginFt) && settings.verticalMarginFt >= 0)) problems.push("verticalMarginFt")
  if (!(Number.isInteger(settings.defaultCircuitHeightFt) && settings.defaultCircuitHeightFt > 0)) problems.push("defaultCircuitHeightFt")
  // The API bounds: corridor 1 to 10 NM, margin 500 to 3000 ft, factors 1 to 2.
  if (!(settings.msaCorridorNm >= 1 && settings.msaCorridorNm <= 10)) problems.push("msaCorridorNm")
  if (!(Number.isInteger(settings.msaMarginFt) && settings.msaMarginFt >= 500 && settings.msaMarginFt <= 3000)) problems.push("msaMarginFt")
  if (!(settings.takeoffSafetyFactor >= 1 && settings.takeoffSafetyFactor <= 2)) problems.push("takeoffSafetyFactor")
  if (!(settings.landingSafetyFactor >= 1 && settings.landingSafetyFactor <= 2)) problems.push("landingSafetyFactor")
  return problems
}
