import { currentLocale } from "@/lib/i18n"

// Display conversions only: the API computes in kg, m, L, NM, kt, ft (design, units).
export const KG_PER_LB = 0.45359237
export const M_PER_IN = 0.0254
export const L_PER_USG = 3.785411784

export type MassUnit = "kg" | "lb"
export type ArmUnit = "m" | "in" | "mm"
export type VolumeUnit = "L" | "USG"

export const massFromKg = (kg: number, unit: MassUnit) => (unit === "lb" ? kg / KG_PER_LB : kg)
export const massToKg = (value: number, unit: MassUnit) => (unit === "lb" ? value * KG_PER_LB : value)

export const armFromM = (m: number, unit: ArmUnit) => (unit === "in" ? m / M_PER_IN : unit === "mm" ? m * 1000 : m)
export const armToM = (value: number, unit: ArmUnit) => (unit === "in" ? value * M_PER_IN : unit === "mm" ? value / 1000 : value)

export const volumeFromL = (l: number, unit: VolumeUnit) => (unit === "USG" ? l / L_PER_USG : l)
export const volumeToL = (value: number, unit: VolumeUnit) => (unit === "USG" ? value * L_PER_USG : value)

/** Rounds away floating noise of a conversion so an input shows "0.41", not "0.41000000000000003". */
export const roundTo = (value: number, digits: number) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

const number = (value: number, digits: number) =>
  new Intl.NumberFormat(currentLocale(), { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(value)

const isNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

/** A course or heading on three digits, as on a nav log: 5.6 → "006°", 360 → "360°". */
export const formatCourse = (deg: number | null | undefined) => {
  if (!isNumber(deg)) return "—"
  let rounded = Math.round(((deg % 360) + 360) % 360)
  if (rounded === 0) rounded = 360
  return `${String(rounded).padStart(3, "0")}°`
}

/** A wind correction with its side: -11.5 → "−12°" (left), 9.6 → "+10°". */
export const formatDrift = (deg: number | null | undefined) => {
  if (!isNumber(deg)) return "—"
  const rounded = Math.round(deg)
  if (rounded === 0) return "0°"
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}°`
}

/** "270/15" — wind from 270° at 15 kt; calm under 1 kt. */
export const formatWind = (wind: { directionDeg: number; speedKt: number } | null | undefined, calm = "calme") => {
  if (!wind || !isNumber(wind.directionDeg) || !isNumber(wind.speedKt)) return "—"
  if (Math.round(wind.speedKt) === 0) return calm
  return `${formatCourse(wind.directionDeg).replace("°", "")}/${Math.round(wind.speedKt)}`
}

export const formatNm = (nm: number | null | undefined, digits = 1) => (isNumber(nm) ? `${number(nm, digits)} NM` : "—")
export const formatKt = (kt: number | null | undefined) => (isNumber(kt) ? `${number(Math.round(kt), 0)} kt` : "—")
export const formatFt = (ft: number | null | undefined) => (isNumber(ft) ? `${number(Math.round(ft), 0)} ft` : "—")
export const formatLitres = (l: number | null | undefined, digits = 1) => (isNumber(l) ? `${number(l, digits)} L` : "—")
export const formatKg = (kg: number | null | undefined, digits = 1) => (isNumber(kg) ? `${number(kg, digits)} kg` : "—")
export const formatArm = (m: number | null | undefined, digits = 3) => (isNumber(m) ? `${number(m, digits)} m` : "—")
export const formatMm = (mm: number | null | undefined) => (isNumber(mm) ? `${number(Math.round(mm), 0)} mm` : "—")
export const formatMoment = (kgm: number | null | undefined) => (isNumber(kgm) ? `${number(kgm, 1)} kg·m` : "—")

/** Minutes as "1 h 05" or "35 min"; a nav log never shows seconds. */
export const formatMinutes = (minutes: number | null | undefined) => {
  if (!isNumber(minutes)) return "—"
  const total = Math.round(minutes)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return `${h} h ${String(m).padStart(2, "0")}`
}

/** UTC clock time of an ETA: "14:05Z". Nav logs are kept in UTC. */
export const formatUtcTime = (iso: string | null | undefined) => {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}Z`
}
