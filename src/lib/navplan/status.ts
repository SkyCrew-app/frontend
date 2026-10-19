import i18n from "@/lib/i18n"
import type { AircraftMassBalance, AircraftPerformance, AirspaceType, CheckStatus } from "./types"

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral"

/** One look for a check everywhere: OK green, warning orange, blocking red. */
export const checkStatusVariant = (status: CheckStatus | null | undefined): BadgeVariant =>
  status === "OK" ? "success" : status === "WARNING" ? "warning" : status === "BLOCKING" ? "danger" : "neutral"

export const checkStatusLabel = (status: CheckStatus | null | undefined) =>
  i18n.t(`navplan:status.${status ?? "UNKNOWN"}`, { defaultValue: status ?? "—" })

export const airspaceTypeLabel = (type: AirspaceType) => i18n.t(`navplan:airspaceType.${type}`, { defaultValue: type })

export interface AirspaceStyle {
  color: string
  fillOpacity: number
  dashed: boolean
}

// Map colours (design § 2.9): P red filled, R/D red/orange hatched (drawn dashed), CTR blue filled,
// TMA/CTA blue dashed, SIV green, RMZ/TMZ purple. Same values in light and dark: they sit on the map.
export const AIRSPACE_STYLES: Record<AirspaceType, AirspaceStyle> = {
  P: { color: "#dc2626", fillOpacity: 0.25, dashed: false },
  R: { color: "#dc2626", fillOpacity: 0.1, dashed: true },
  D: { color: "#ea580c", fillOpacity: 0.1, dashed: true },
  TRA: { color: "#dc2626", fillOpacity: 0.08, dashed: true },
  TSA: { color: "#dc2626", fillOpacity: 0.08, dashed: true },
  CTR: { color: "#2563eb", fillOpacity: 0.18, dashed: false },
  TMA: { color: "#2563eb", fillOpacity: 0.05, dashed: true },
  CTA: { color: "#2563eb", fillOpacity: 0.05, dashed: true },
  SIV: { color: "#16a34a", fillOpacity: 0.04, dashed: false },
  RMZ: { color: "#9333ea", fillOpacity: 0.06, dashed: true },
  TMZ: { color: "#9333ea", fillOpacity: 0.06, dashed: true },
  PROTECTED: { color: "#65a30d", fillOpacity: 0.06, dashed: true },
  GLIDING: { color: "#0891b2", fillOpacity: 0.05, dashed: true },
  OTHER: { color: "#6b7280", fillOpacity: 0.05, dashed: true },
  // Activities published at a point: a symbol and a dashed ring of the distance the plans look at.
  PARACHUTING: { color: "#be185d", fillOpacity: 0.08, dashed: true },
  AEROBATICS: { color: "#be185d", fillOpacity: 0.08, dashed: true },
  WINCH: { color: "#0e7490", fillOpacity: 0.08, dashed: true },
  BALLOON: { color: "#0e7490", fillOpacity: 0.08, dashed: true },
  LOW_OVERFLIGHT: { color: "#b91c1c", fillOpacity: 0.06, dashed: true },
  MODEL_AIRCRAFT: { color: "#4d7c0f", fillOpacity: 0.05, dashed: true },
  DRONE: { color: "#4d7c0f", fillOpacity: 0.05, dashed: true },
}

/**
 * The API refuses to compute mass and balance with unconfirmed aircraft data: it answers BLOCKING
 * with no lines and an empty envelope (contract change 5). That is "not computed", not "out of limits".
 */
export const massBalanceComputed = (result: { lines: unknown[]; envelope: { points: unknown[] } }) =>
  result.lines.length > 0 && result.envelope.points.length > 0

export type AircraftDataState = "MISSING" | "INCOMPLETE" | "NOT_VALIDATED" | "VALIDATED"

export type MissingAircraftField =
  | "emptyMass"
  | "emptyArm"
  | "weighingDate"
  | "mtow"
  | "mlw"
  | "seats"
  | "envelope"
  | "tanks"
  | "cruise"
  | "reserve"
  | "descent"

/** What an aircraft still lacks before it can be used for mass & balance and fuel. */
export function missingAircraftData(
  performance: AircraftPerformance | null | undefined,
  massBalance: AircraftMassBalance | null | undefined,
): MissingAircraftField[] {
  const missing: MissingAircraftField[] = []
  const positive = (value: number | null | undefined) => typeof value === "number" && value > 0
  if (!positive(massBalance?.emptyMassKg)) missing.push("emptyMass")
  if (typeof massBalance?.emptyArmM !== "number") missing.push("emptyArm")
  if (!massBalance?.weighingDate) missing.push("weighingDate")
  if (!positive(massBalance?.mtowKg)) missing.push("mtow")
  if (!positive(massBalance?.mlwKg)) missing.push("mlw")
  if (!massBalance?.stations.some((station) => station.kind === "SEAT")) missing.push("seats")
  if (!massBalance?.envelopes.some((envelope) => envelope.points.length >= 3)) missing.push("envelope")
  if (!performance?.fuel.tanks.some((tank) => tank.usableL > 0)) missing.push("tanks")
  if (!performance?.cruise.rows.some((row) => row.tasKt > 0 && row.fuelFlowLph > 0)) missing.push("cruise")
  if (!positive(performance?.reserve.holdingFuelFlowLph) || !positive(performance?.reserve.maxContinuousFuelFlowLph)) {
    missing.push("reserve")
  }
  if (!positive(performance?.descent.rateFpm)) missing.push("descent")
  return missing
}

export function aircraftDataState(
  performance: AircraftPerformance | null | undefined,
  massBalance: AircraftMassBalance | null | undefined,
): AircraftDataState {
  if (!performance && !massBalance) return "MISSING"
  if (missingAircraftData(performance, massBalance).length > 0) return "INCOMPLETE"
  if (!performance?.validatedAt || !massBalance?.validatedAt) return "NOT_VALIDATED"
  return "VALIDATED"
}
