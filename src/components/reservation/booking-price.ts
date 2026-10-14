// The price of a booking, computed as the API does (backend booking-rules.ts):
// aircraft hourly rate × booked duration, plus the instructor's fee, rounded once
// to the cent. The API charges the price; this only shows it beforehand.

// What an instructor adds per booked hour. Zero in the API today (an owner decision
// still pending there); keep it equal to INSTRUCTOR_FEE_PER_HOUR of the API.
export const INSTRUCTOR_FEE_PER_HOUR = 0

const HOUR = 60 * 60 * 1000

/** Price in euros, or null when the rate or the slot is unknown. */
export const bookingPrice = (
  hourlyCost: number | null | undefined,
  start: Date,
  end: Date,
  withInstructor = false,
): number | null => {
  const hours = (end.getTime() - start.getTime()) / HOUR
  if (hourlyCost == null || !Number.isFinite(Number(hourlyCost)) || !Number.isFinite(hours) || hours <= 0) return null
  const cents =
    Math.round(hours * Number(hourlyCost) * 100) + (withInstructor ? Math.round(hours * INSTRUCTOR_FEE_PER_HOUR * 100) : 0)
  return cents / 100
}

/**
 * What changing a booking moves on the pilot's account, in euros: positive is charged,
 * negative refunded. The API prices a booking again only when its slot or aircraft changes.
 */
export const priceDifference = (newPrice: number | null, chargedAmount: number | null | undefined): number | null => {
  if (newPrice == null || chargedAmount == null) return null
  return Math.round((newPrice - Number(chargedAmount)) * 100) / 100
}
