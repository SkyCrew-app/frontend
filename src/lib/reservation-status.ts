// One wording and one colour per reservation status, wherever it is shown.
type StatusVariant = "success" | "warning" | "danger" | "neutral"

const STATUSES: Record<string, { label: string; variant: StatusVariant }> = {
  CONFIRMED: { label: "Confirmée", variant: "success" },
  PENDING: { label: "En attente", variant: "warning" },
  CANCELLED: { label: "Annulée", variant: "danger" },
}

export const reservationStatus = (status: string | null | undefined) =>
  STATUSES[(status ?? "").toUpperCase()] ?? { label: status || "Inconnu", variant: "neutral" as StatusVariant }
