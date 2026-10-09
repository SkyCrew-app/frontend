export type Taxonomies = {
  aircraftCategories: string[]
  flightTypes: string[]
  licenseTypes: string[]
  maintenanceTypes: string[]
}

type LoadedTaxonomies = Partial<Record<keyof Taxonomies, string[] | null>> | null

/**
 * Listes de taxonomie du formulaire des paramètres, à partir de
 * l'enregistrement chargé. Seules les quatre listes sont reprises (pas de
 * `__typename`), car l'objet est renvoyé tel quel dans `TaxonomiesInput`.
 */
export function taxonomiesFromRecord(record: { taxonomies?: LoadedTaxonomies } | null | undefined): Taxonomies {
  const taxonomies = record?.taxonomies
  return {
    aircraftCategories: [...(taxonomies?.aircraftCategories ?? [])],
    flightTypes: [...(taxonomies?.flightTypes ?? [])],
    licenseTypes: [...(taxonomies?.licenseTypes ?? [])],
    maintenanceTypes: [...(taxonomies?.maintenanceTypes ?? [])],
  }
}
