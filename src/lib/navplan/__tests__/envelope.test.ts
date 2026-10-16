import { chartDomain, niceTicks, pointInPolygon, polygonArea, polygonIssues, scales } from "../envelope"

// Envelope of the fictitious F-TEST (design § 4.5).
const F_TEST = [
  { armM: 0.205, massKg: 550 },
  { armM: 0.205, massKg: 780 },
  { armM: 0.427, massKg: 900 },
  { armM: 0.564, massKg: 900 },
  { armM: 0.564, massKg: 550 },
]

describe("envelope typed by an administrator", () => {
  it("accepts the F-TEST envelope", () => {
    expect(polygonIssues(F_TEST)).toEqual([])
    expect(Math.abs(polygonArea(F_TEST))).toBeGreaterThan(0)
  })

  it("needs at least three points", () => {
    expect(polygonIssues(F_TEST.slice(0, 2))).toEqual(["TOO_FEW_POINTS"])
  })

  it("finds sides that cross (two points typed in the wrong order)", () => {
    const swapped = [F_TEST[0], F_TEST[1], F_TEST[3], F_TEST[2], F_TEST[4]]
    expect(polygonIssues([F_TEST[0], F_TEST[3], F_TEST[1], F_TEST[4]])).toContain("SELF_INTERSECTING")
    expect(polygonIssues(swapped)).toContain("SELF_INTERSECTING")
  })

  it("finds aligned points and impossible values", () => {
    expect(polygonIssues([{ armM: 0.2, massKg: 500 }, { armM: 0.3, massKg: 600 }, { armM: 0.4, massKg: 700 }])).toEqual(["ZERO_AREA"])
    expect(polygonIssues([...F_TEST, { armM: Number.NaN, massKg: 700 }])).toEqual(["INVALID_VALUE"])
    expect(polygonIssues([...F_TEST.slice(0, 4), { armM: 0.564, massKg: 0 }])).toEqual(["INVALID_VALUE"])
  })
})

describe("preview of a point in the envelope", () => {
  it("places the cases of the design", () => {
    // Case 1: take-off 862.6 kg at 0.4938 m, landing 833.8 kg at 0.4722 m.
    expect(pointInPolygon({ armM: 0.4938, massKg: 862.6 }, F_TEST)).toBe(true)
    expect(pointInPolygon({ armM: 0.4722, massKg: 833.8 }, F_TEST)).toBe(true)
    // Case 2: 1009.2 kg at 0.6068 m.
    expect(pointInPolygon({ armM: 0.6068, massKg: 1009.2 }, F_TEST)).toBe(false)
    // Case 5: exactly on the aft limit.
    expect(pointInPolygon({ armM: 0.564, massKg: 700 }, F_TEST)).toBe(true)
    // In front of the sloping forward limit.
    expect(pointInPolygon({ armM: 0.25, massKg: 870 }, F_TEST)).toBe(false)
  })
})

describe("chart geometry", () => {
  it("frames the envelope and the points with a margin", () => {
    const domain = chartDomain(F_TEST, [{ armM: 0.6068, massKg: 1009.2 }])!
    expect(domain.minArm).toBeLessThan(0.205)
    expect(domain.maxArm).toBeGreaterThan(0.6068)
    expect(domain.maxMass).toBeGreaterThan(1009.2)
    expect(chartDomain([])).toBeNull()
  })

  it("chooses round ticks", () => {
    expect(niceTicks(0.18, 0.6, 5)).toEqual([0.2, 0.3, 0.4, 0.5, 0.6])
    expect(niceTicks(520, 1030, 5)).toEqual([600, 800, 1000])
    expect(niceTicks(5, 5)).toEqual([])
  })

  it("draws heavier masses higher and aft arms further right", () => {
    const scale = scales({ minArm: 0, maxArm: 1, minMass: 500, maxMass: 1000 }, 100, 100, { left: 0, right: 0, top: 0, bottom: 0 })
    expect(scale.x(1)).toBe(100)
    expect(scale.y(1000)).toBe(0)
    expect(scale.y(500)).toBe(100)
  })
})
