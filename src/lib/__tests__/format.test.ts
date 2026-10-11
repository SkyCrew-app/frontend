import { formatDecimal, formatFlightDuration } from "../format"

describe("formatDecimal", () => {
  it("shows a computed figure with a readable precision", () => {
    expect(formatDecimal(18.7023198776617)).toBe("18,7")
    expect(formatDecimal(18.7023198776617, 2)).toBe("18,7")
    expect(formatDecimal(1.256, 2)).toBe("1,26")
    expect(formatDecimal("42")).toBe("42")
  })

  it("says when there is no figure", () => {
    expect(formatDecimal(null)).toBe("N/A")
    expect(formatDecimal(undefined)).toBe("N/A")
    expect(formatDecimal("abc")).toBe("N/A")
  })
})

describe("formatFlightDuration", () => {
  it("turns hours into hours and minutes", () => {
    expect(formatFlightDuration(0.18833333333333332)).toBe("11 min")
    expect(formatFlightDuration(1.5)).toBe("1 h 30")
    expect(formatFlightDuration(2)).toBe("2 h")
    expect(formatFlightDuration(1.0833)).toBe("1 h 05")
    expect(formatFlightDuration(0)).toBe("0 min")
  })

  it("says when there is no duration", () => {
    expect(formatFlightDuration(null)).toBe("N/A")
    expect(formatFlightDuration(undefined)).toBe("N/A")
  })
})
