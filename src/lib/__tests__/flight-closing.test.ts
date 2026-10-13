import { closeBlocker, groundsAircraft } from "../flight-closing"

const now = new Date(2026, 9, 13, 12, 0)
const booking = (values: object = {}) =>
  ({
    id: 1,
    start_time: new Date(2026, 9, 13, 10, 0).toISOString(),
    end_time: new Date(2026, 9, 13, 11, 0).toISOString(),
    status: "confirmed",
    ...values,
  }) as never

describe("closeBlocker", () => {
  it("lets a flight be closed once its booking has started", () => {
    expect(closeBlocker({ reservation: booking() }, { now })).toBeNull()
  })

  it("waits for the booking to start", () => {
    const later = booking({ start_time: new Date(2026, 9, 13, 14, 0).toISOString() })
    expect(closeBlocker({ reservation: later }, { now })).toBe("notStarted")
  })

  it("does not offer a flight already closed, or one whose booking is cancelled", () => {
    expect(closeBlocker({ closed_at: now.toISOString(), reservation: booking() }, { now })).toBe("closed")
    expect(closeBlocker({ reservation: booking({ status: "cancelled" }) }, { now })).toBe("bookingCancelled")
  })

  it("leaves a flight without a booking to administrators", () => {
    expect(closeBlocker({}, { now })).toBe("noBooking")
    expect(closeBlocker({}, { now, isAdmin: true })).toBeNull()
  })
})

describe("groundsAircraft", () => {
  it("only for the top severity", () => {
    expect(groundsAircraft("high")).toBe(true)
    expect(groundsAircraft("medium")).toBe(false)
    expect(groundsAircraft(undefined)).toBe(false)
  })
})
