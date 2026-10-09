// Figures computed by the API come with many decimals: show a readable number.
export const formatDecimal = (value: number | string | null | undefined, digits = 1): string => {
  const number = typeof value === "string" ? Number(value) : value
  if (number === null || number === undefined || Number.isNaN(number)) return "N/A"
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(number)
}

// A duration in hours, shown as hours and minutes: 0.19 becomes "11 min".
export const formatFlightDuration = (hours: number | string | null | undefined): string => {
  const value = typeof hours === "string" ? Number(hours) : hours
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A"
  const totalMinutes = Math.round(value * 60)
  const h = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (h === 0) return `${minutes} min`
  return minutes === 0 ? `${h} h` : `${h} h ${String(minutes).padStart(2, "0")}`
}
