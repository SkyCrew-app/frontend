import type { Flight } from "@/interfaces/flight"

type StateVariant = "success" | "warning" | "info" | "danger" | "neutral"

// Where a flight plan stands, with one wording and one colour on the list and on the detail page.
export const flightPlanState = (
  flight: Pick<Flight, "closed_at" | "reservation">,
  now: Date = new Date(),
): { label: string; variant: StateVariant } => {
  if (flight.closed_at) return { label: "Clôturé", variant: "success" }
  if (String(flight.reservation?.status ?? "").toUpperCase() === "CANCELLED") {
    return { label: "Réservation annulée", variant: "danger" }
  }
  if (flight.reservation?.end_time && new Date(flight.reservation.end_time) < now) {
    return { label: "À clôturer", variant: "warning" }
  }
  return { label: "Prévu", variant: "info" }
}
