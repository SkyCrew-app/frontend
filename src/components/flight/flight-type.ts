import { FLIGHT_CATEGORY_LABELS } from "@/components/reservation/flight-category"

// `flight_type` is free text in the API: a flight rule (VFR…), a reservation category
// copied by the generator, or a legacy value. One readable label for all of them.
const FLIGHT_RULES = ["VFR", "IFR", "SVFR"]

const LEGACY_LABELS: Record<string, string> = {
  "GENERATED VIA AI": "Généré automatiquement",
}

export const FLIGHT_RULE_OPTIONS = FLIGHT_RULES.map((rule) => ({ value: rule, label: rule }))

export const flightTypeLabel = (type: string | null | undefined): string => {
  if (!type) return "—"
  const key = type.trim().toUpperCase()
  if (FLIGHT_RULES.includes(key)) return key
  return FLIGHT_CATEGORY_LABELS[key] ?? LEGACY_LABELS[key] ?? type.charAt(0).toUpperCase() + type.slice(1)
}
