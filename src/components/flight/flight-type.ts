import i18n from "@/lib/i18n"
import { FLIGHT_CATEGORIES, flightCategoryLabel, isFlightCategory } from "@/components/reservation/flight-category"

// `flight_type` is the category of the flight, the same list as the reservation category,
// stored in lower case (`local`, `cross_country`…). Older flights may still hold a flight
// rule (VFR…) or another legacy value: those are shown as they are.
export const FLIGHT_TYPES = FLIGHT_CATEGORIES.map((category) => category.toLowerCase())

const LEGACY_KEYS: Record<string, string> = {
  "GENERATED VIA AI": "flights:flightType.generated",
}

/** The stored value for a category written in any case, or undefined for anything else. */
export const toFlightType = (value: string | null | undefined): string | undefined => {
  const type = value?.trim().toLowerCase()
  return type && FLIGHT_TYPES.includes(type) ? type : undefined
}

/** The type a flight is closed with: the plan's own, else the reservation's category, else local. */
export const defaultFlightType = (planType?: string | null, reservationCategory?: string | null): string =>
  toFlightType(planType) ?? toFlightType(reservationCategory) ?? "local"

// Built at use time: the labels follow the language.
export const flightTypeOptions = () => FLIGHT_TYPES.map((value) => ({ value, label: flightCategoryLabel(value) }))

export const flightTypeLabel = (type: string | null | undefined): string => {
  if (!type) return "—"
  const key = type.trim().toUpperCase()
  if (isFlightCategory(key)) return flightCategoryLabel(key)
  if (LEGACY_KEYS[key]) return i18n.t(LEGACY_KEYS[key])
  return type.charAt(0).toUpperCase() + type.slice(1)
}
