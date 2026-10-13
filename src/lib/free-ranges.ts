export interface TimeRange {
  start: Date
  end: Date
}

interface BusyPeriod {
  start_time: string | Date
  end_time: string | Date
}

interface FreeRangeOptions {
  /** Nothing is offered before this instant (now, for today); rounded up to the quarter hour. */
  notBefore?: Date
  /** Shortest range worth offering, in minutes. */
  minMinutes?: number
}

const QUARTER_HOUR_MS = 15 * 60 * 1000

const roundUpToQuarterHour = (date: Date) => new Date(Math.ceil(date.getTime() / QUARTER_HOUR_MS) * QUARTER_HOUR_MS)

/**
 * The periods of a day during which an aircraft is free: the opening hours
 * minus its reservations. Reservations may overlap, touch, or run past the
 * opening hours; the result is sorted and never overlaps a reservation.
 */
export function freeRanges(
  opening: Date,
  closing: Date,
  reservations: BusyPeriod[],
  { notBefore, minMinutes = 30 }: FreeRangeOptions = {},
): TimeRange[] {
  const earliest = notBefore ? roundUpToQuarterHour(notBefore).getTime() : -Infinity
  const dayStart = Math.max(opening.getTime(), earliest)
  const dayEnd = closing.getTime()
  if (!Number.isFinite(dayStart) || !Number.isFinite(dayEnd) || dayEnd <= dayStart) return []

  const busy = reservations
    .map((reservation) => ({
      start: new Date(reservation.start_time).getTime(),
      end: new Date(reservation.end_time).getTime(),
    }))
    .filter(({ start, end }) => Number.isFinite(start) && Number.isFinite(end) && end > dayStart && start < dayEnd)
    .sort((a, b) => a.start - b.start)

  const ranges: TimeRange[] = []
  const minimum = minMinutes * 60 * 1000
  const push = (start: number, end: number) => {
    if (end - start >= minimum) ranges.push({ start: new Date(start), end: new Date(end) })
  }

  let cursor = dayStart
  for (const { start, end } of busy) {
    if (start > cursor) push(cursor, start)
    cursor = Math.max(cursor, end)
  }
  if (cursor < dayEnd) push(cursor, dayEnd)

  return ranges
}
