import i18n from "@/lib/i18n"
import type { Flight } from "@/interfaces/flight"

type StateVariant = "success" | "warning" | "info" | "danger" | "neutral"

// Where a flight plan stands, with one wording and one colour on the list and on the detail page.
export const flightPlanState = (
  flight: Pick<Flight, "closed_at" | "reservation">,
  now: Date = new Date(),
): { label: string; variant: StateVariant } => {
  if (flight.closed_at) return { label: i18n.t("flights:planState.closed"), variant: "success" }
  if (String(flight.reservation?.status ?? "").toUpperCase() === "CANCELLED") {
    return { label: i18n.t("flights:planState.reservationCancelled"), variant: "danger" }
  }
  if (flight.reservation?.end_time && new Date(flight.reservation.end_time) < now) {
    return { label: i18n.t("flights:planState.toClose"), variant: "warning" }
  }
  return { label: i18n.t("flights:planState.planned"), variant: "info" }
}
