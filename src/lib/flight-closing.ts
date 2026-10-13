import type { Flight } from "@/interfaces/flight"

// Longest flight the API accepts in one go, in hours (MAX_FLIGHT_HOURS on the server).
export const MAX_FLIGHT_HOURS = 24

export type CloseBlocker = "closed" | "noBooking" | "bookingCancelled" | "notStarted"

/**
 * Why the API would refuse to close this flight now, or `null` when it can be closed.
 * The API decides; this only keeps the screens from offering what it would refuse.
 */
export const closeBlocker = (
  flight: Pick<Flight, "closed_at" | "reservation">,
  { isAdmin = false, now = new Date() }: { isAdmin?: boolean; now?: Date } = {},
): CloseBlocker | null => {
  if (flight.closed_at) return "closed"
  const reservation = flight.reservation
  // A flight without a booking is recorded by an administrator only.
  if (!reservation) return isAdmin ? null : "noBooking"
  if (String(reservation.status ?? "").toUpperCase() === "CANCELLED") return "bookingCancelled"
  if (reservation.start_time && new Date(reservation.start_time) > now) return "notStarted"
  return null
}

// Severity that takes the aircraft out of service as soon as the incident is reported.
export const groundsAircraft = (severity: string | null | undefined) => severity === "high"
