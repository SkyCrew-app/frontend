// Axis ticks for a chart of flight hours: round steps (10 min, 15 min, 30 min, 1 h, 2 h…) so
// that the labels read "30 min", "1 h", "1 h 30" rather than "1 h 12" or "0.225".
const STEPS = [1 / 6, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500]

export const durationTicks = (maxHours: number, maxTicks = 4): number[] => {
  const top = Number.isFinite(maxHours) && maxHours > 0 ? maxHours : 1
  const step = STEPS.find((candidate) => Math.ceil(top / candidate) <= maxTicks) ?? Math.ceil(top / maxTicks)
  const count = Math.ceil(top / step)
  return Array.from({ length: count + 1 }, (_, index) => Math.round(index * step * 1000) / 1000)
}
