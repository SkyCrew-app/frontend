// One French label per flight category (the API enum `FlightCategory`), wherever it is shown.
export const FLIGHT_CATEGORY_LABELS: Record<string, string> = {
  LOCAL: "Local",
  CROSS_COUNTRY: "Navigation",
  INSTRUCTION: "Instruction",
  TOURISM: "Tourisme",
  TRAINING: "Entraînement",
  MAINTENANCE: "Maintenance",
  PRIVATE: "Privé",
  CORPORATE: "Affaires",
}

export const FLIGHT_CATEGORY_OPTIONS = Object.entries(FLIGHT_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export const flightCategoryLabel = (category: string | null | undefined): string => {
  if (!category) return "—"
  return FLIGHT_CATEGORY_LABELS[category.toUpperCase()] ?? category
}
