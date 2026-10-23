"use client"

import { useTranslation } from "react-i18next"
import { pointLabel } from "@/lib/navplan/aerodrome"
import type { FlightPlanResult } from "@/lib/navplan/types"
import { formatFt, formatNumber } from "@/lib/navplan/units"
import { useElementWidth } from "./useElementWidth"

type ProfileResult = Pick<FlightPlanResult, "legs" | "profile" | "terrainProfile" | "terrainSource" | "totalDistanceNm">

const HEIGHT = 220
const PAD = { top: 12, right: 12, bottom: 34, left: 48 }

/** A round step for about `count` ticks between 0 and `max`. */
export function tickStep(max: number, count = 4): number {
  const raw = Math.max(max, 1) / count
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((candidate) => candidate >= raw) ?? raw
  return step
}

/**
 * The vertical profile of the route: the planned altitude over the terrain (highest point near
 * the track, every half nautical mile) and the obstacles, with the minimum safe altitude of each
 * leg dashed. Nothing to scroll: drawn at the width of the page.
 */
export function TerrainProfileChart({ result }: { result: ProfileResult }) {
  const { t } = useTranslation("navplan")
  const [ref, width] = useElementWidth<HTMLDivElement>(640)
  const terrain = result.terrainProfile ?? []
  if (result.legs.length === 0 || (terrain.length === 0 && result.profile.length === 0)) return null

  const total = Math.max(result.totalDistanceNm, 0.1)
  const legStarts: number[] = []
  let run = 0
  for (const leg of result.legs) {
    legStarts.push(run)
    run += leg.distanceNm
  }
  const msas = result.legs.map((leg) => leg.terrain?.msaFt ?? null)
  const heights = [
    ...result.profile.map((p) => p.altitudeFt),
    ...terrain.map((p) => Math.max(p.terrainFt ?? 0, p.obstacleFt ?? 0)),
    ...msas.map((m) => m ?? 0),
    ...result.legs.map((leg) => leg.altitudeFt),
  ]
  const step = tickStep(Math.max(...heights) * 1.08)
  const top = Math.ceil((Math.max(...heights) * 1.08) / step) * step || step
  const innerWidth = Math.max(width - PAD.left - PAD.right, 100)
  const innerHeight = HEIGHT - PAD.top - PAD.bottom
  const x = (nm: number) => PAD.left + (Math.min(Math.max(nm, 0), total) / total) * innerWidth
  const y = (ft: number) => PAD.top + innerHeight - (Math.max(ft, 0) / top) * innerHeight
  const floor = y(0)

  // Terrain as an area down to sea level; a gap where it is unknown.
  const runs: [number, number][][] = [[]]
  for (const point of terrain) {
    if (point.terrainFt == null) runs.push([])
    else runs[runs.length - 1].push([x(point.distanceNm), y(point.terrainFt)])
  }
  const closed = runs
    .filter((points) => points.length > 1)
    .map((points) => `M${points[0][0]},${floor} ${points.map(([px, py]) => `L${px},${py}`).join(" ")} L${points[points.length - 1][0]},${floor} Z`)

  const planned = result.profile.map((p) => `${x(p.distanceNm)},${y(p.altitudeFt)}`).join(" ")
  const obstacles = terrain.filter((p) => p.obstacleFt != null)
  const yTicks: number[] = []
  for (let value = 0; value <= top; value += step) yTicks.push(value)
  const xStep = tickStep(total, Math.max(2, Math.floor(innerWidth / 70)))
  const xTicks: number[] = []
  for (let value = 0; value <= total + 1e-6; value += xStep) xTicks.push(value)
  // Point names where they do not overlap.
  const names: { at: number; label: string }[] = []
  for (const [i, leg] of result.legs.entries()) {
    const at = x(legStarts[i] + leg.distanceNm)
    if (i === result.legs.length - 1 || names.every((n) => Math.abs(n.at - at) > 44)) names.push({ at, label: pointLabel(leg.to) })
  }
  names.unshift({ at: x(0), label: pointLabel(result.legs[0].from) })

  const highestTerrain = Math.max(0, ...terrain.map((p) => p.terrainFt ?? 0))
  const known = msas.filter((m): m is number => m != null)
  const below = result.legs.filter((leg) => leg.terrain?.status === "WARNING" && leg.terrain.msaFt != null)
  const summary = [
    t("profile.summary", { terrain: formatFt(highestTerrain), msa: known.length ? formatFt(Math.max(...known)) : "?" }),
    below.length ? t("profile.belowMsa", { count: below.length }) : null,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <figure className="space-y-2">
      <div ref={ref} className="w-full">
        <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-label={`${t("profile.title")}. ${summary}`} className="block max-w-full">
          {yTicks.map((value) => (
            <g key={`y${value}`}>
              <line x1={PAD.left} x2={PAD.left + innerWidth} y1={y(value)} y2={y(value)} className="stroke-border" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(value) + 4} textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                {formatNumber(value, 0)}
              </text>
            </g>
          ))}
          <text x={4} y={PAD.top + 4} className="fill-muted-foreground text-[11px]">
            ft
          </text>
          {xTicks.map((value) => (
            <text key={`x${value}`} x={x(value)} y={HEIGHT - PAD.bottom + 13} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums">
              {formatNumber(value, 0)}
            </text>
          ))}
          <text x={PAD.left + innerWidth} y={floor - 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
            NM
          </text>
          {closed.map((path) => (
            <path key={path.slice(0, 24)} d={path} className="fill-muted-foreground/30 stroke-muted-foreground" strokeWidth={1} />
          ))}
          {result.legs.map((leg, i) =>
            i > 0 ? <line key={`leg${i}`} x1={x(legStarts[i])} x2={x(legStarts[i])} y1={PAD.top} y2={floor} className="stroke-border" strokeDasharray="2 3" /> : null,
          )}
          {obstacles.map((point) => (
            <g key={`o${point.distanceNm}`} className="fill-warning stroke-warning">
              <line x1={x(point.distanceNm)} x2={x(point.distanceNm)} y1={y(point.terrainFt ?? 0)} y2={y(point.obstacleFt!)} strokeWidth={1.5} />
              <path d={`M${x(point.distanceNm) - 3},${y(point.obstacleFt!) + 4} L${x(point.distanceNm)},${y(point.obstacleFt!) - 2} L${x(point.distanceNm) + 3},${y(point.obstacleFt!) + 4} Z`} />
            </g>
          ))}
          {result.legs.map((leg, i) => {
            const msa = msas[i]
            if (msa == null) return null
            const warn = leg.terrain?.status === "WARNING"
            return (
              <g key={`msa${i}`}>
                <line
                  x1={x(legStarts[i])}
                  x2={x(legStarts[i] + leg.distanceNm)}
                  y1={y(msa)}
                  y2={y(msa)}
                  className={warn ? "stroke-destructive" : "stroke-warning"}
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                />
                {x(legStarts[i] + leg.distanceNm) - x(legStarts[i]) > 70 && (
                  <text x={x(legStarts[i]) + 4} y={y(msa) - 4} className={warn ? "fill-destructive text-[11px] font-semibold" : "fill-muted-foreground text-[11px]"}>
                    MSA {formatNumber(msa, 0)}
                  </text>
                )}
              </g>
            )
          })}
          {planned && <polyline points={planned} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" />}
          <line x1={PAD.left} x2={PAD.left + innerWidth} y1={floor} y2={floor} className="stroke-muted-foreground" strokeWidth={1} />
          {names.map((name) => (
            <text key={`n${name.at}`} x={name.at} y={HEIGHT - 4} textAnchor={name.at < PAD.left + 20 ? "start" : name.at > width - 40 ? "end" : "middle"} className="fill-foreground text-[11px] font-medium">
              {name.label}
            </text>
          ))}
        </svg>
      </div>
      <figcaption className="space-y-1 text-xs text-muted-foreground">
        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label={t("profile.legend")}>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 bg-primary" aria-hidden="true" />
            {t("profile.planned")}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-5 border border-muted-foreground bg-muted-foreground/30" aria-hidden="true" />
            {t("profile.terrain")}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block w-5 border-t-2 border-dashed border-warning" aria-hidden="true" />
            {t("profile.msa")}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-0 border-x-4 border-b-[7px] border-x-transparent border-b-warning" aria-hidden="true" />
            {t("profile.obstacle")}
          </li>
        </ul>
        <p>{summary}</p>
        {result.terrainSource && <p>{result.terrainSource.attribution}</p>}
      </figcaption>
    </figure>
  )
}
