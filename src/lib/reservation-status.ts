import i18n from "@/lib/i18n"

// One wording and one colour per reservation status, wherever it is shown.
type StatusVariant = "success" | "warning" | "danger" | "neutral"

const VARIANTS: Record<string, StatusVariant> = {
  CONFIRMED: "success",
  PENDING: "warning",
  CANCELLED: "danger",
}

export const reservationStatus = (status: string | null | undefined) => {
  const code = (status ?? "").toUpperCase()
  if (VARIANTS[code]) return { label: i18n.t(`common:reservationStatus.${code}`), variant: VARIANTS[code] }
  return { label: status || i18n.t("common:reservationStatus.unknown"), variant: "neutral" as StatusVariant }
}
