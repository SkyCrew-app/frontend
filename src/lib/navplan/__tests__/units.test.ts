import {
  armFromM,
  armToM,
  formatCourse,
  formatDrift,
  formatKg,
  formatMinutes,
  formatNm,
  formatUtcTime,
  formatWind,
  massFromKg,
  massToKg,
  roundTo,
  volumeFromL,
  volumeToL,
} from "../units"

describe("unit conversions for display", () => {
  it("converts masses with the exact pound of the design (1 lb = 0.45359237 kg)", () => {
    expect(massToKg(100, "lb")).toBeCloseTo(45.359237, 9)
    expect(massFromKg(45.359237, "lb")).toBeCloseTo(100, 9)
    expect(massToKg(100, "kg")).toBe(100)
  })

  it("converts arms between metres, millimetres and inches (1 in = 0.0254 m)", () => {
    expect(armToM(100, "in")).toBeCloseTo(2.54, 12)
    expect(armFromM(0.41, "mm")).toBeCloseTo(410, 9)
    expect(armToM(410, "mm")).toBeCloseTo(0.41, 12)
    expect(roundTo(armFromM(1.12, "in"), 2)).toBe(44.09)
  })

  it("converts fuel with the US gallon of the design (1 USG = 3.785411784 L)", () => {
    expect(volumeToL(10, "USG")).toBeCloseTo(37.85411784, 9)
    expect(volumeFromL(37.85411784, "USG")).toBeCloseTo(10, 9)
  })

  it("round-trips a typed value without drifting", () => {
    expect(roundTo(massFromKg(massToKg(170, "lb"), "lb"), 1)).toBe(170)
    expect(roundTo(volumeFromL(volumeToL(26.5, "USG"), "USG"), 1)).toBe(26.5)
  })
})

describe("nav log formats", () => {
  it("writes courses on three digits, north as 360", () => {
    expect(formatCourse(5.6)).toBe("006°")
    expect(formatCourse(268.43)).toBe("268°")
    expect(formatCourse(0.2)).toBe("360°")
    expect(formatCourse(-11.54)).toBe("348°")
    expect(formatCourse(null)).toBe("—")
  })

  it("signs the wind correction angle", () => {
    expect(formatDrift(-11.54)).toBe("−12°")
    expect(formatDrift(9.59)).toBe("+10°")
    expect(formatDrift(0.3)).toBe("0°")
  })

  it("writes the wind as direction/speed, calm under one knot", () => {
    expect(formatWind({ directionDeg: 270, speedKt: 15 })).toBe("270/15")
    expect(formatWind({ directionDeg: 5, speedKt: 8 })).toBe("005/8")
    expect(formatWind({ directionDeg: 120, speedKt: 0.4 }, "calme")).toBe("calme")
  })

  it("writes times as hours and minutes, ETAs in UTC", () => {
    expect(formatMinutes(35)).toBe("35 min")
    expect(formatMinutes(80)).toBe("1 h 20")
    expect(formatMinutes(65.4)).toBe("1 h 05")
    expect(formatUtcTime("2026-10-17T09:07:12.000Z")).toBe("09:07Z")
  })

  it("writes distances and masses in French", () => {
    expect(formatNm(260.4)).toBe("260,4 NM")
    expect(formatKg(1009.2)).toBe("1 009,2 kg".replace(" ", " "))
  })
})
