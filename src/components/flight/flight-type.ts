import i18n from "@/lib/i18n"
import { flightCategoryLabel, isFlightCategory } from "@/components/reservation/flight-category"

// `flight_type` is free text in the API: a flight rule (VFR…), a reservation category
// copied by the generator, or a legacy value. One readable label for all of them.
const FLIGHT_RULES = ["VFR", "IFR", "SVFR"]

const LEGACY_KEYS: Record<string, string> = {
  "GENERATED VIA AI": "flights:flightType.generated",
}

export const FLIGHT_RULE_OPTIONS = FLIGHT_RULES.map((rule) => ({ value: rule, label: rule }))

export const flightTypeLabel = (type: string | null | undefined): string => {
  if (!type) return "—"
  const key = type.trim().toUpperCase()
  if (FLIGHT_RULES.includes(key)) return key
  if (isFlightCategory(key)) return flightCategoryLabel(key)
  if (LEGACY_KEYS[key]) return i18n.t(LEGACY_KEYS[key])
  return type.charAt(0).toUpperCase() + type.slice(1)
}
