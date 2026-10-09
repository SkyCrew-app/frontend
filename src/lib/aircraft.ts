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
