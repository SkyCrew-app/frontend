import i18n, { currentLocale } from "@/lib/i18n"

// Figures computed by the API come with many decimals: show a readable number.
export const formatDecimal = (value: number | string | null | undefined, digits = 1): string => {
  const number = typeof value === "string" ? Number(value) : value
  if (number === null || number === undefined || Number.isNaN(number)) return "—"
  return new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: digits }).format(number)
}

// A duration in hours, shown as hours and minutes: 0.19 becomes "11 min".
export const formatFlightDuration = (hours: number | string | null | undefined): string => {
  const value = typeof hours === "string" ? Number(hours) : hours
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  const totalMinutes = Math.round(value * 60)
  const h = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (h === 0) return `${minutes} min`
  return minutes === 0 ? `${h} h` : `${h} h ${String(minutes).padStart(2, "0")}`
}

type DateInput = Date | string | number | null | undefined

const toDate = (value: DateInput): Date | null => {
  if (value === null || value === undefined || value === "") return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// The date formats of the app. One spelling everywhere: "12 oct. 2026".
export const formatDate = (value: DateInput, fallback = "—"): string => {
  const date = toDate(value)
  return date ? date.toLocaleDateString(currentLocale(), { day: "numeric", month: "short", year: "numeric" }) : fallback
}

// "14:30"
export const formatTime = (value: DateInput, fallback = "—"): string => {
  const date = toDate(value)
  return date ? date.toLocaleTimeString(currentLocale(), { hour: "2-digit", minute: "2-digit" }) : fallback
}

// "12 oct. 2026 à 14:30"
export const formatDateTime = (value: DateInput, fallback = "—"): string => {
  const date = toDate(value)
  return date ? i18n.t("common:format.dateTime", { date: formatDate(date), time: formatTime(date) }) : fallback
}

// "1 250,00 €"
export const formatMoney = (value: number | string | null | undefined, fallback = "—"): string => {
  const number = typeof value === "string" ? Number(value) : value
  if (number === null || number === undefined || Number.isNaN(number)) return fallback
  return new Intl.NumberFormat(currentLocale(), { style: "currency", currency: "EUR" }).format(number)
}
