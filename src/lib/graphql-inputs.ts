/**
 * Convertit un identifiant (nombre ou chaîne) en entier, ou `null` s'il est
 * absent ou invalide. Évite d'envoyer `NaN` (sérialisé en `null`) à l'API.
 */
export function toIntId(value: unknown): number | null {
  if (typeof value === "number") return Number.isInteger(value) ? value : null
  if (typeof value !== "string" || value.trim() === "") return null
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

/**
 * Retourne `{ [key]: id }` quand l'identifiant est un vrai nombre, sinon `{}` :
 * à étaler dans un input de mise à jour pour omettre le champ plutôt que
 * d'envoyer `null`.
 */
export function optionalIdField<K extends string>(key: K, value: unknown): Partial<Record<K, number>> {
  const id = toIntId(value)
  return (id === null ? {} : { [key]: id }) as Partial<Record<K, number>>
}
