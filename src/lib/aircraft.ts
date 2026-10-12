// Champs `Int` de CreateAircraftInput / UpdateAircraftInput.
const INTEGER_FIELDS = ["year_of_manufacture", "maxAltitude", "cruiseSpeed", "consumption"] as const

/**
 * Prépare les valeurs d'un formulaire d'aéronef pour l'API :
 * - les champs entiers sont arrondis (l'API refuse un décimal) ;
 * - un nombre illisible (champ vidé) devient `null` ;
 * - une date d'inspection vidée devient `null` au lieu de "".
 * Les champs absents du formulaire restent absents.
 */
export function buildAircraftInput<T extends object>(formData: T): T {
  const input = { ...formData } as Record<string, unknown>

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      input[key] = null
    }
  }

  for (const field of INTEGER_FIELDS) {
    const value = input[field]
    if (typeof value === "number") {
      input[field] = Math.round(value)
    }
  }

  if ("last_inspection_date" in input && !input.last_inspection_date) {
    input.last_inspection_date = null
  }

  return input as T
}

// Powered flight starts in 1903: no aircraft was built before.
export const FIRST_MANUFACTURE_YEAR = 1903

// Bounds of the year of manufacture field, shared by the aircraft forms.
export const manufactureYearBounds = () => ({ min: FIRST_MANUFACTURE_YEAR, max: new Date().getFullYear() })

type StatusVariant = "success" | "warning" | "info" | "danger" | "neutral"

// One wording and one colour per availability status, wherever it is shown.
const AVAILABILITIES: Record<string, { label: string; variant: StatusVariant }> = {
  AVAILABLE: { label: "Disponible", variant: "success" },
  RESERVATED: { label: "Réservé", variant: "info" },
  UNAVAILABLE: { label: "Indisponible", variant: "danger" },
}

// Order used by the filters, the forms and the charts.
export const AIRCRAFT_AVAILABILITY_VALUES = ["AVAILABLE", "RESERVATED", "UNAVAILABLE"] as const

export const aircraftAvailability = (status: string | null | undefined) =>
  AVAILABILITIES[(status ?? "").toUpperCase()] ?? { label: status || "—", variant: "neutral" as StatusVariant }

// The maintenance state of an aircraft is free text in the API. The forms
// write the first value of each line; the others are older spellings.
const MAINTENANCE_STATES: { values: string[]; label: string; variant: StatusVariant }[] = [
  { values: ["OK", "OPERATIONAL"], label: "Opérationnel", variant: "success" },
  { values: ["Maintenance requise", "NEEDS_MAINTENANCE"], label: "Maintenance requise", variant: "warning" },
  { values: ["En maintenance", "IN_MAINTENANCE"], label: "En maintenance", variant: "danger" },
]

// Values offered by the aircraft forms.
export const AIRCRAFT_MAINTENANCE_STATE_VALUES = MAINTENANCE_STATES.map((state) => state.values[0])

// An unknown value is a note typed by hand ("Visite 100 h en cours"): it is shown as written.
export const aircraftMaintenanceState = (status: string | null | undefined) => {
  const value = (status ?? "").trim().toLowerCase()
  const known = MAINTENANCE_STATES.find((state) => state.values.some((candidate) => candidate.toLowerCase() === value))
  return known
    ? { label: known.label, variant: known.variant }
    : { label: status?.trim() || "—", variant: "neutral" as StatusVariant }
}

// The API returns the path of a photo or document as it is stored (`/uploads/…`).
export const aircraftFileUrl = (baseUrl: string, path: string) => (/^(https?:|data:|blob:)/.test(path) ? path : `${baseUrl}${path}`)

export const aircraftFileName = (path: string) => {
  const name = path.split("/").pop() || path
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}
