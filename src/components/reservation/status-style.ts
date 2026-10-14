// Colours of a reservation block in the calendar, matching the badge variants of `reservationStatus()`.
const BLOCKS: Record<string, { block: string; dot: string }> = {
  CONFIRMED: { block: "bg-success/15 text-success border-l-2 border-l-success hover:bg-success/25", dot: "bg-success" },
  PENDING: { block: "bg-warning/15 text-warning border-l-2 border-l-warning hover:bg-warning/25", dot: "bg-warning" },
  CANCELLED: {
    block: "bg-destructive/10 text-destructive border-l-2 border-l-destructive line-through hover:bg-destructive/20",
    dot: "bg-destructive",
  },
}

const FALLBACK = { block: "bg-muted text-muted-foreground border-l-2 border-l-border hover:bg-muted/80", dot: "bg-muted-foreground" }

export const reservationBlockClass = (status: string | null | undefined) =>
  (BLOCKS[(status ?? "").toUpperCase()] ?? FALLBACK).block

export const reservationDotClass = (status: string | null | undefined) =>
  (BLOCKS[(status ?? "").toUpperCase()] ?? FALLBACK).dot

// Every booking is confirmed when it is made and a cancelled one is removed: "pending" never
// happens, so the legend leaves it out (old data keeps its colour).
export const LEGEND_STATUSES = ["CONFIRMED", "CANCELLED"]
