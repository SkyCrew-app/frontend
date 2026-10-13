import i18n from "@/lib/i18n"

// One wording and one colour per reservation status, wherever it is shown.
type StatusVariant = "success" | "warning" | "danger" | "neutral"

const VARIANTS: Record<string, StatusVariant> = {
  CONFIRMED: "success",
  PENDING: "warning",
  CANCELLED: "danger",
}

type Booking = {
  status?: string | null
  start_time?: string | Date | null
  flights?: { closed_at?: string | null }[] | null
}

// The same rules as the API (booking-rules.ts), so that the interface does not
// offer what the API would refuse. The API remains the one that decides.
export const hasReservationStarted = (reservation: Booking, now: Date = new Date()) =>
  reservation.start_time != null && now.getTime() > new Date(reservation.start_time).getTime()

const isCancelled = (reservation: Booking) => (reservation.status ?? "").toUpperCase() === "CANCELLED"
const hasClosedFlight = (reservation: Booking) =>
  (reservation.flights ?? []).some((flight) => Boolean(flight.closed_at))

// A booking can be cancelled by its holder until it starts, unless it already is or its
// flight has been closed (the hours are then in the logbook). Once it has started, only an
// administrator cancels it.
export const canCancelReservation = (
  reservation: Booking,
  { isAdmin = false, now = new Date() }: { isAdmin?: boolean; now?: Date } = {},
) => !isCancelled(reservation) && !hasClosedFlight(reservation) && (isAdmin || !hasReservationStarted(reservation, now))

// A booking is changed before it starts, by anyone.
export const canEditReservation = (reservation: Booking, now: Date = new Date()) =>
  !isCancelled(reservation) && !hasClosedFlight(reservation) && !hasReservationStarted(reservation, now)

export const reservationStatus = (status: string | null | undefined) => {
  const code = (status ?? "").toUpperCase()
  if (VARIANTS[code]) return { label: i18n.t(`common:reservationStatus.${code}`), variant: VARIANTS[code] }
  return { label: status || i18n.t("common:reservationStatus.unknown"), variant: "neutral" as StatusVariant }
}
