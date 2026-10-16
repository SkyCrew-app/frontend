import type { EnvelopePoint } from "./types"

// Geometry for drawing a centre-of-gravity envelope and checking what an administrator typed.
// The verdict "within limits" of a flight always comes from the API.

export interface Domain {
  minArm: number
  maxArm: number
  minMass: number
  maxMass: number
}

export interface ChartPoint {
  armM: number
  massKg: number
}

/** The area to draw: the envelope and the plotted points, with a margin around them. */
export function chartDomain(envelope: ChartPoint[], plotted: ChartPoint[] = []): Domain | null {
  const all = [...envelope, ...plotted].filter((point) => Number.isFinite(point.armM) && Number.isFinite(point.massKg))
  if (all.length === 0) return null
  let minArm = Math.min(...all.map((point) => point.armM))
  let maxArm = Math.max(...all.map((point) => point.armM))
  let minMass = Math.min(...all.map((point) => point.massKg))
  let maxMass = Math.max(...all.map((point) => point.massKg))
  const armSpan = maxArm - minArm || 0.1
  const massSpan = maxMass - minMass || 100
  minArm -= armSpan * 0.08
  maxArm += armSpan * 0.08
  minMass -= massSpan * 0.08
  maxMass += massSpan * 0.08
  return { minArm, maxArm, minMass, maxMass }
}

/** About `count` round tick values between min and max (1, 2 or 5 × 10^n steps). */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return []
  const rough = (max - min) / Math.max(1, count)
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) ?? 10 * power
  const ticks: number[] = []
  for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-9; value += step) {
    ticks.push(Number(value.toFixed(10)))
  }
  return ticks
}

export interface Scale {
  x: (armM: number) => number
  y: (massKg: number) => number
}

export function scales(domain: Domain, width: number, height: number, padding: { left: number; right: number; top: number; bottom: number }): Scale {
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  return {
    x: (armM) => padding.left + ((armM - domain.minArm) / (domain.maxArm - domain.minArm)) * innerWidth,
    y: (massKg) => padding.top + (1 - (massKg - domain.minMass) / (domain.maxMass - domain.minMass)) * innerHeight,
  }
}

/** Signed area in (m × kg); 0 for a degenerate polygon. */
export function polygonArea(points: EnvelopePoint[]): number {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    area += a.armM * b.massKg - b.armM * a.massKg
  }
  return area / 2
}

const orientation = (a: EnvelopePoint, b: EnvelopePoint, c: EnvelopePoint) =>
  (b.armM - a.armM) * (c.massKg - a.massKg) - (b.massKg - a.massKg) * (c.armM - a.armM)

const segmentsCross = (a: EnvelopePoint, b: EnvelopePoint, c: EnvelopePoint, d: EnvelopePoint) => {
  const o1 = orientation(a, b, c)
  const o2 = orientation(a, b, d)
  const o3 = orientation(c, d, a)
  const o4 = orientation(c, d, b)
  return o1 * o2 < 0 && o3 * o4 < 0
}

export type PolygonIssue = "TOO_FEW_POINTS" | "SELF_INTERSECTING" | "ZERO_AREA" | "INVALID_VALUE"

/** What is wrong with an envelope as typed (design § 5.1: "polygone simple, sens cohérent"). */
export function polygonIssues(points: EnvelopePoint[]): PolygonIssue[] {
  if (points.some((point) => !Number.isFinite(point.armM) || !Number.isFinite(point.massKg) || point.massKg <= 0)) {
    return ["INVALID_VALUE"]
  }
  if (points.length < 3) return ["TOO_FEW_POINTS"]
  const issues: PolygonIssue[] = []
  const n = points.length
  outer: for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // Adjacent edges share a vertex: not a crossing.
      if (j === i + 1 || (i === 0 && j === n - 1)) continue
      if (segmentsCross(points[i], points[(i + 1) % n], points[j], points[(j + 1) % n])) {
        issues.push("SELF_INTERSECTING")
        break outer
      }
    }
  }
  if (Math.abs(polygonArea(points)) < 1e-9) issues.push("ZERO_AREA")
  return issues
}

/** Ray casting; a point on an edge counts as inside (design § 2.5). Preview only. */
export function pointInPolygon(point: ChartPoint, polygon: EnvelopePoint[]): boolean {
  if (polygon.length < 3) return false
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const onLine = Math.abs(orientation(a, b, { armM: point.armM, massKg: point.massKg })) < 1e-9
    const within =
      point.armM >= Math.min(a.armM, b.armM) - 1e-12 &&
      point.armM <= Math.max(a.armM, b.armM) + 1e-12 &&
      point.massKg >= Math.min(a.massKg, b.massKg) - 1e-9 &&
      point.massKg <= Math.max(a.massKg, b.massKg) + 1e-9
    if (onLine && within) return true
  }
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    if (a.massKg > point.massKg !== b.massKg > point.massKg) {
      const armAtMass = ((b.armM - a.armM) * (point.massKg - a.massKg)) / (b.massKg - a.massKg) + a.armM
      if (point.armM < armAtMass) inside = !inside
    }
  }
  return inside
}
