"use client"

import { useId } from "react"
import { useTranslation } from "react-i18next"
import { chartDomain, niceTicks, scales, type ChartPoint } from "@/lib/navplan/envelope"
import type { EnvelopePoint } from "@/lib/navplan/types"
import { currentLocale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export interface PlottedPoint extends ChartPoint {
  /** Short label drawn next to the point: "DÉC", "ATT"… */
  label: string
  /** Long name for the text alternative. */
  name: string
  within: boolean
  shape?: "circle" | "square" | "diamond"
}

interface MassBalanceChartProps {
  envelope: EnvelopePoint[]
  points?: PlottedPoint[]
  /** Draws the take-off → landing segment between the first two points. */
  showPath?: boolean
  className?: string
  title?: string
}

const WIDTH = 480
const HEIGHT = 320
const PADDING = { left: 60, right: 24, top: 18, bottom: 48 }

const number = (value: number, digits: number) =>
  new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: digits }).format(value)

/**
 * Centre-of-gravity envelope (arm in m, mass in kg) with the computed points. Drawn in SVG with
 * the theme colours; the verdict "within limits" is the API's, the chart only shows it.
 */
export function MassBalanceChart({ envelope, points = [], showPath = false, className, title }: MassBalanceChartProps) {
  const { t } = useTranslation("navplan")
  const descriptionId = useId()
  const domain = chartDomain(envelope, points)

  if (!domain) {
    return (
      <div className={cn("flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground", className)}>
        {t("massBalance.chart.empty")}
      </div>
    )
  }

  const scale = scales(domain, WIDTH, HEIGHT, PADDING)
  const armTicks = niceTicks(domain.minArm, domain.maxArm, 6)
  const massTicks = niceTicks(domain.minMass, domain.maxMass, 5)
  const polygon = envelope.map((point) => `${scale.x(point.armM)},${scale.y(point.massKg)}`).join(" ")
  const path = showPath && points.length >= 2 ? points.slice(0, 2) : []
  const pathWithin = path.every((point) => point.within)

  const description = [
    envelope.length >= 3 ? t("massBalance.chart.envelopeDescription", { count: envelope.length }) : t("massBalance.chart.noEnvelope"),
    ...points.map((point) =>
      t("massBalance.chart.pointDescription", {
        name: point.name,
        mass: number(point.massKg, 1),
        arm: number(point.armM, 3),
        verdict: point.within ? t("massBalance.within") : t("massBalance.outside"),
      }),
    ),
  ].join(" ")

  return (
    <figure className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={title ?? t("massBalance.chart.title")}
        aria-describedby={descriptionId}
      >

        {/* Grid and axes */}
        <g className="text-muted-foreground" fontSize="13">
          {armTicks.map((tick) => (
            <g key={`x-${tick}`}>
              <line x1={scale.x(tick)} x2={scale.x(tick)} y1={PADDING.top} y2={HEIGHT - PADDING.bottom} className="stroke-border" />
              <text x={scale.x(tick)} y={HEIGHT - PADDING.bottom + 16} textAnchor="middle" fill="currentColor">
                {number(tick, 3)}
              </text>
            </g>
          ))}
          {massTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={scale.y(tick)} y2={scale.y(tick)} className="stroke-border" />
              <text x={PADDING.left - 6} y={scale.y(tick) + 4} textAnchor="end" fill="currentColor">
                {number(tick, 0)}
              </text>
            </g>
          ))}
          <text x={(PADDING.left + WIDTH - PADDING.right) / 2} y={HEIGHT - 6} textAnchor="middle" fill="currentColor">
            {t("massBalance.chart.armAxis")}
          </text>
          <text
            x={14}
            y={(PADDING.top + HEIGHT - PADDING.bottom) / 2}
            textAnchor="middle"
            fill="currentColor"
            transform={`rotate(-90 14 ${(PADDING.top + HEIGHT - PADDING.bottom) / 2})`}
          >
            {t("massBalance.chart.massAxis")}
          </text>
        </g>

        {envelope.length >= 3 && (
          <polygon points={polygon} className="fill-primary/10 stroke-primary" strokeWidth={2} strokeLinejoin="round" />
        )}
        {envelope.length > 0 && envelope.length < 3 && (
          <polyline points={polygon} className="fill-none stroke-primary" strokeWidth={2} strokeDasharray="4 3" />
        )}

        {path.length === 2 && (
          <line
            x1={scale.x(path[0].armM)}
            y1={scale.y(path[0].massKg)}
            x2={scale.x(path[1].armM)}
            y2={scale.y(path[1].massKg)}
            className={pathWithin ? "stroke-success" : "stroke-destructive"}
            strokeWidth={2}
            strokeDasharray="5 3"
          />
        )}

        {points.map((point, index) => {
          const x = scale.x(point.armM)
          const y = scale.y(point.massKg)
          const below = labelBelow(points.slice(0, index).map((other) => [scale.x(other.armM), scale.y(other.massKg)]), [x, y])
          const tone = point.within ? "fill-success stroke-background" : "fill-destructive stroke-background"
          return (
            <g key={point.label}>
              {point.shape === "square" ? (
                <rect x={x - 5} y={y - 5} width={10} height={10} className={tone} strokeWidth={1.5} />
              ) : point.shape === "diamond" ? (
                <rect x={x - 5} y={y - 5} width={10} height={10} className={tone} strokeWidth={1.5} transform={`rotate(45 ${x} ${y})`} />
              ) : (
                <circle cx={x} cy={y} r={6} className={tone} strokeWidth={1.5} />
              )}
              <text x={x + 9} y={below ? y + 18 : y - 7} fontSize="13" fontWeight={600} className={point.within ? "fill-success" : "fill-destructive"}>
                {point.label}
              </text>
            </g>
          )
        })}
      </svg>
      <p id={descriptionId} className="sr-only">
        {description}
      </p>
    </figure>
  )
}

/** A label goes under its point when an earlier point (and its label above) sits close by. */
export const labelBelow = (earlier: [number, number][], [x, y]: [number, number]) =>
  earlier.some(([ox, oy]) => Math.abs(ox - x) < 40 && Math.abs(oy - y) < 20)
