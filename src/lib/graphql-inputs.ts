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

export interface FlightPlanDraft {
  flight_hours: number
  flight_type: string
  origin_icao: string
  destination_icao: string
  number_of_passengers: number
  encoded_polyline?: string
  distance_km?: number
  estimated_flight_time?: number
  waypoints?: string[]
}

export interface CreateFlightInputPayload {
  flight_hours: number
  flight_type: string
  origin_icao: string
  destination_icao: string
  number_of_passengers: number
  encoded_polyline?: string
  distance_km?: number
  estimated_flight_time?: number
  waypoints?: string[]
  user_id: number
  reservation_id: number | null
}

/**
 * Construit l'input de `createFlight` à partir des seuls champs définis par
 * `CreateFlightInput` (les champs propres à l'écran, comme la vitesse ou
 * l'altitude de croisière, sont ignorés).
 * Retourne `null` tant que l'identifiant de l'utilisateur n'est pas connu.
 */
export function buildCreateFlightInput(
  flightPlan: FlightPlanDraft,
  userId: unknown,
  reservationId: unknown,
): CreateFlightInputPayload | null {
  const user_id = toIntId(userId)
  if (user_id === null) return null

  return {
    flight_hours: flightPlan.flight_hours,
    flight_type: flightPlan.flight_type,
    origin_icao: flightPlan.origin_icao,
    destination_icao: flightPlan.destination_icao,
    number_of_passengers: flightPlan.number_of_passengers,
    encoded_polyline: flightPlan.encoded_polyline,
    distance_km: flightPlan.distance_km,
    estimated_flight_time: flightPlan.estimated_flight_time,
    waypoints: flightPlan.waypoints,
    user_id,
    reservation_id: toIntId(reservationId),
  }
}
