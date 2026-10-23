"use client"

import { useId } from "react"
import { useTranslation } from "react-i18next"
import { chartDomain, niceTicks, scales, type ChartPoint } from "@/lib/navplan/envelope"
import type { EnvelopePoint } from "@/lib/navplan/types"
import { currentLocale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useElementWidth } from "./useElementWidth"

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

// Drawn at the width of its box between these bounds (2:3), so the text stays legible on a phone.
const MAX_WIDTH = 480
const MIN_WIDTH = 300
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
  const [boxRef, boxWidth] = useElementWidth<HTMLElement>(MAX_WIDTH)
  const width = Math.min(Math.max(boxWidth, MIN_WIDTH), MAX_WIDTH)
  const height = Math.round((width * 2) / 3)
  const domain = chartDomain(envelope, points)

  if (!domain) {
    return (
      <div className={cn("flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground", className)}>
        {t("massBalance.chart.empty")}
      </div>
    )
  }

  const scale = scales(domain, width, height, PADDING)
  const armTicks = niceTicks(domain.minArm, domain.maxArm, 6)
  const massTicks = niceTicks(domain.minMass, domain.maxMass, 5)
  const polygon = envelope.map((point) => `${scale.x(point.armM)},${scale.y(point.massKg)}`).join(" ")
  const path = showPath && points.length >= 2 ? points.slice(0, 2) : []
  const pathWithin = path.every((point) => point.within)
  const labels = sharedLabels(points.map((point) => ({ label: point.label, at: [scale.x(point.armM), scale.y(point.massKg)] })))

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
    <figure ref={boxRef} className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto h-auto w-full max-w-lg"
        role="img"
        aria-label={title ?? t("massBalance.chart.title")}
        aria-describedby={descriptionId}
      >

        {/* Grid and axes */}
        <g className="text-muted-foreground" fontSize="13">
          {armTicks.map((tick) => (
            <g key={`x-${tick}`}>
              <line x1={scale.x(tick)} x2={scale.x(tick)} y1={PADDING.top} y2={height - PADDING.bottom} className="stroke-border" />
              <text x={scale.x(tick)} y={height - PADDING.bottom + 16} textAnchor="middle" fill="currentColor">
                {number(tick, 3)}
              </text>
            </g>
          ))}
          {massTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line x1={PADDING.left} x2={width - PADDING.right} y1={scale.y(tick)} y2={scale.y(tick)} className="stroke-border" />
              <text x={PADDING.left - 6} y={scale.y(tick) + 4} textAnchor="end" fill="currentColor">
                {number(tick, 0)}
              </text>
            </g>
          ))}
          <text x={(PADDING.left + width - PADDING.right) / 2} y={height - 6} textAnchor="middle" fill="currentColor">
            {t("massBalance.chart.armAxis")}
          </text>
          <text
            x={14}
            y={(PADDING.top + height - PADDING.bottom) / 2}
            textAnchor="middle"
            fill="currentColor"
            transform={`rotate(-90 14 ${(PADDING.top + height - PADDING.bottom) / 2})`}
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
          const label = labels[index]
          const below = labelBelow(
            points.slice(0, index).flatMap((other, otherIndex) => (labels[otherIndex] ? [[scale.x(other.armM), scale.y(other.massKg)] as [number, number]] : [])),
            [x, y],
          )
          const tone = point.within ? "fill-success stroke-background" : "fill-destructive stroke-background"
          return (
            <g key={point.label}>
              <PointMark shape={point.shape} x={x} y={y} className={tone} />
              {label && (
                <text x={x + 9} y={below ? y + 18 : y - 7} fontSize="13" fontWeight={600} className={point.within ? "fill-success" : "fill-destructive"}>
                  {label}
                </text>
              )}
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

function PointMark({ shape, x, y, className }: { shape: PlottedPoint["shape"]; x: number; y: number; className: string }) {
  if (shape === "square") return <rect x={x - 5} y={y - 5} width={10} height={10} className={className} strokeWidth={1.5} />
  if (shape === "diamond")
    return <rect x={x - 5} y={y - 5} width={10} height={10} className={className} strokeWidth={1.5} transform={`rotate(45 ${x} ${y})`} />
  return <circle cx={x} cy={y} r={6} className={className} strokeWidth={1.5} />
}

// Points closer than this (in chart units) are drawn at the same spot.
const SAME_SPOT = 4

/**
 * The label written next to each point: points at the same spot (take-off, landing and zero fuel
 * of a flight with no fuel) share one label "DÉC · ATT · ZF", written by the first; the others none.
 */
export const sharedLabels = (points: { label: string; at: [number, number] }[]): (string | null)[] => {
  const leaders = points.map((point, index) =>
    points.findIndex((other, otherIndex) => otherIndex <= index && Math.abs(other.at[0] - point.at[0]) < SAME_SPOT && Math.abs(other.at[1] - point.at[1]) < SAME_SPOT),
  )
  return points.map((_, index) =>
    leaders[index] === index ? points.filter((__, otherIndex) => leaders[otherIndex] === index).map((point) => point.label).join(" · ") : null,
  )
}

/** A label goes under its point when an earlier point (and its label above) sits close by. */
export const labelBelow = (earlier: [number, number][], [x, y]: [number, number]) =>
  earlier.some(([ox, oy]) => Math.abs(ox - x) < 40 && Math.abs(oy - y) < 20)
