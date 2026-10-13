import i18n from "@/lib/i18n"

// The API enum `FlightCategory`. One label per category, wherever it is shown.
export const FLIGHT_CATEGORIES = [
  "LOCAL",
  "CROSS_COUNTRY",
  "INSTRUCTION",
  "TOURISM",
  "TRAINING",
  "MAINTENANCE",
  "PRIVATE",
  "CORPORATE",
]

export const isFlightCategory = (category: string | null | undefined): boolean =>
  !!category && FLIGHT_CATEGORIES.includes(category)

export const flightCategoryLabel = (category: string | null | undefined): string => {
  if (!category) return "—"
  const key = category.toUpperCase()
  return FLIGHT_CATEGORIES.includes(key) ? i18n.t(`reservations:flightCategory.${key}`) : category
}

// Built at use time: the labels follow the language.
export const flightCategoryOptions = () =>
  FLIGHT_CATEGORIES.map((value) => ({ value, label: flightCategoryLabel(value) }))
