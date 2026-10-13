import i18n from "@/lib/i18n"

// One wording and one colour per reservation status, wherever it is shown.
type StatusVariant = "success" | "warning" | "danger" | "neutral"

const VARIANTS: Record<string, StatusVariant> = {
  CONFIRMED: "success",
  PENDING: "warning",
  CANCELLED: "danger",
}

// A booking can still be cancelled by its holder unless it already is, or
// its flight has been closed (the hours are then in the logbook).
export const canCancelReservation = (reservation: {
  status?: string | null
  flights?: { closed_at?: string | null }[] | null
}) =>
  (reservation.status ?? "").toUpperCase() !== "CANCELLED" &&
  !(reservation.flights ?? []).some((flight) => Boolean(flight.closed_at))

export const reservationStatus = (status: string | null | undefined) => {
  const code = (status ?? "").toUpperCase()
  if (VARIANTS[code]) return { label: i18n.t(`common:reservationStatus.${code}`), variant: VARIANTS[code] }
  return { label: status || i18n.t("common:reservationStatus.unknown"), variant: "neutral" as StatusVariant }
}
