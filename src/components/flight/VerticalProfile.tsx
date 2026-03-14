"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WaypointData {
  ident: string
  type: string
  lat: number
  lon: number
  alt: number
  name?: string | null
  ground_speed_kts?: number
  time_from_dep_min?: number
  leg_distance_nm?: number
}

interface VerticalProfileProps {
  waypoints: WaypointData[]
  maxAltitude?: number
  className?: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const toRad = (d: number) => (d * Math.PI) / 180

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function formatAlt(alt: number): string {
  if (!alt || alt <= 0) return "GND"
  if (alt >= 5000) return `FL${Math.round(alt / 100).toString().padStart(3, "0")}`
  return `${alt}ft`
}

type Phase = "climb" | "cruise" | "descent" | "ground"

function getPhase(type: string): Phase {
  const t = type?.toUpperCase() ?? ""
  if (["SID", "TOC"].includes(t)) return "climb"
  if (["TOD", "STAR", "APP"].includes(t)) return "descent"
  if (t === "APT") return "ground"
  return "cruise"
}

const PHASE_COLORS: Record<Phase, string> = {
  climb: "#22C55E",
  cruise: "#E040FB",
  descent: "#F59E0B",
  ground: "#64748B",
}

const PHASE_FILLS: Record<Phase, string> = {
  climb: "rgba(34,197,94,0.15)",
  cruise: "rgba(224,64,251,0.08)",
  descent: "rgba(245,158,11,0.15)",
  ground: "rgba(100,116,139,0.1)",
}

/* ------------------------------------------------------------------ */
/*  Theme-adaptive palette                                             */
/* ------------------------------------------------------------------ */

interface SvgPalette {
  chartBg: string
  gridAlt: string
  gridDist: string
  axisText: string
  axisLabel: string
  groundLine: string
  identMajor: string
  identMinor: string
  altLabel: string
  dotStroke: string
  gradientFrom: string
  gradientTo: string
}

const PALETTE_DARK: SvgPalette = {
  chartBg: "rgba(15,15,25,0.4)",
  gridAlt: "rgba(255,255,255,0.06)",
  gridDist: "rgba(255,255,255,0.04)",
  axisText: "#888",
  axisLabel: "#aaa",
  groundLine: "#444",
  identMajor: "#fff",
  identMinor: "#bbb",
  altLabel: "#999",
  dotStroke: "rgba(0,0,0,0.6)",
  gradientFrom: "0.15",
  gradientTo: "0.02",
}

const PALETTE_LIGHT: SvgPalette = {
  chartBg: "rgba(241,245,249,0.8)",
  gridAlt: "rgba(0,0,0,0.08)",
  gridDist: "rgba(0,0,0,0.06)",
  axisText: "#555",
  axisLabel: "#444",
  groundLine: "#cbd5e1",
  identMajor: "#1e293b",
  identMinor: "#64748b",
  altLabel: "#64748b",
  dotStroke: "rgba(255,255,255,0.8)",
  gradientFrom: "0.12",
  gradientTo: "0.02",
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function VerticalProfile({ waypoints, maxAltitude, className = "" }: VerticalProfileProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const pal = mounted && resolvedTheme === "light" ? PALETTE_LIGHT : PALETTE_DARK

  const profileData = useMemo(() => {
    if (!waypoints || waypoints.length < 2) return null

    // Compute cumulative distance for each waypoint
    const points: {
      ident: string
      type: string
      alt: number
      cumDistNm: number
      phase: Phase
    }[] = []

    let cumDist = 0
    let tocIdx = -1
    let todIdx = -1

    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i]
      if (i > 0) {
        const prev = waypoints[i - 1]
        cumDist += wp.leg_distance_nm ?? haversineNm(prev.lat, prev.lon, wp.lat, wp.lon)
      }

      if (wp.type?.toUpperCase() === "TOC") tocIdx = i
      if (wp.type?.toUpperCase() === "TOD") todIdx = i

      points.push({
        ident: wp.ident,
        type: wp.type,
        alt: wp.alt || 0,
        cumDistNm: cumDist,
        phase: getPhase(wp.type),
      })
    }

    // Refine phases based on TOC/TOD position
    for (let i = 0; i < points.length; i++) {
      if (tocIdx >= 0 && i <= tocIdx && points[i].phase !== "ground") {
        points[i].phase = "climb"
      } else if (todIdx >= 0 && i >= todIdx && points[i].phase !== "ground") {
        points[i].phase = "descent"
      } else if (tocIdx >= 0 && todIdx >= 0 && i > tocIdx && i < todIdx) {
        points[i].phase = "cruise"
      }
    }

    const maxDist = cumDist || 1
    const maxAlt = Math.max(...points.map((p) => p.alt), maxAltitude || 0, 1000)

    return { points, maxDist, maxAlt, tocIdx, todIdx }
  }, [waypoints, maxAltitude])

  if (!profileData) return null

  const { points, maxDist, maxAlt } = profileData

  // SVG dimensions
  const svgWidth = 900
  const svgHeight = 280
  const padding = { top: 30, right: 40, bottom: 60, left: 60 }
  const chartW = svgWidth - padding.left - padding.right
  const chartH = svgHeight - padding.top - padding.bottom

  const xScale = (dist: number) => padding.left + (dist / maxDist) * chartW
  const yScale = (alt: number) => padding.top + chartH - (alt / (maxAlt * 1.15)) * chartH

  // Build path data
  const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.cumDistNm).toFixed(1)} ${yScale(p.alt).toFixed(1)}`).join(" ")

  // Build fill area (closed path to bottom)
  const fillData = `${pathData} L ${xScale(points[points.length - 1].cumDistNm).toFixed(1)} ${yScale(0).toFixed(1)} L ${xScale(0).toFixed(1)} ${yScale(0).toFixed(1)} Z`

  // Altitude grid lines
  const altSteps: number[] = []
  const altStep = maxAlt <= 5000 ? 1000 : maxAlt <= 15000 ? 2500 : 5000
  for (let a = 0; a <= maxAlt * 1.15; a += altStep) {
    altSteps.push(a)
  }

  // Distance grid lines
  const distSteps: number[] = []
  const distStep = maxDist <= 50 ? 10 : maxDist <= 150 ? 25 : maxDist <= 400 ? 50 : 100
  for (let d = 0; d <= maxDist; d += distStep) {
    distSteps.push(d)
  }

  // Build colored segments
  const segments: { x1: number; y1: number; x2: number; y2: number; phase: Phase }[] = []
  for (let i = 0; i < points.length - 1; i++) {
    segments.push({
      x1: xScale(points[i].cumDistNm),
      y1: yScale(points[i].alt),
      x2: xScale(points[i + 1].cumDistNm),
      y2: yScale(points[i + 1].alt),
      phase: points[i + 1].phase,
    })
  }

  return (
    <Card className={`shadow-lg border-border/50 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span>Profil Vertical</span>
          <Badge variant="outline" className="ml-auto font-mono text-xs">
            {maxDist.toFixed(0)} NM — Alt max {formatAlt(Math.max(...points.map((p) => p.alt)))}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-2 md:p-4">
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full"
            style={{ minWidth: "600px", maxHeight: "320px" }}
          >
            {/* Background */}
            <rect x={padding.left} y={padding.top} width={chartW} height={chartH} fill={pal.chartBg} rx="4" />

            {/* Altitude grid */}
            {altSteps.map((a) => (
              <g key={`alt-${a}`}>
                <line
                  x1={padding.left}
                  y1={yScale(a)}
                  x2={padding.left + chartW}
                  y2={yScale(a)}
                  stroke={pal.gridAlt}
                  strokeDasharray="4,4"
                />
                <text
                  x={padding.left - 8}
                  y={yScale(a) + 3}
                  textAnchor="end"
                  fill={pal.axisText}
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {a >= 5000 ? `FL${Math.round(a / 100)}` : `${a}`}
                </text>
              </g>
            ))}

            {/* Distance grid */}
            {distSteps.map((d) => (
              <g key={`dist-${d}`}>
                <line
                  x1={xScale(d)}
                  y1={padding.top}
                  x2={xScale(d)}
                  y2={padding.top + chartH}
                  stroke={pal.gridDist}
                  strokeDasharray="2,4"
                />
                <text
                  x={xScale(d)}
                  y={padding.top + chartH + 14}
                  textAnchor="middle"
                  fill={pal.axisText}
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {d}
                </text>
              </g>
            ))}

            {/* Axis labels */}
            <text
              x={padding.left - 8}
              y={padding.top - 10}
              textAnchor="end"
              fill={pal.axisLabel}
              fontSize="9"
              fontFamily="monospace"
            >
              ALT (ft)
            </text>
            <text
              x={padding.left + chartW / 2}
              y={svgHeight - 6}
              textAnchor="middle"
              fill={pal.axisLabel}
              fontSize="9"
              fontFamily="monospace"
            >
              Distance (NM)
            </text>

            {/* Fill under curve */}
            <defs>
              <linearGradient id="profile-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E040FB" stopOpacity={pal.gradientFrom} />
                <stop offset="100%" stopColor="#E040FB" stopOpacity={pal.gradientTo} />
              </linearGradient>
            </defs>
            <path d={fillData} fill="url(#profile-fill)" />

            {/* Colored route segments */}
            {segments.map((seg, i) => (
              <line
                key={`seg-${i}`}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke={PHASE_COLORS[seg.phase]}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ))}

            {/* Waypoint dots + labels */}
            {points.map((p, i) => {
              const x = xScale(p.cumDistNm)
              const y = yScale(p.alt)
              const type = p.type?.toUpperCase() ?? ""
              const isMajor = ["APT", "VOR", "TOC", "TOD"].includes(type)
              const radius = isMajor ? 4 : 2.5
              const dotColor = PHASE_COLORS[p.phase]

              // Alternate label position to avoid overlap
              const labelAbove = i % 2 === 0

              return (
                <g key={`wp-${i}`}>
                  {/* Vertical tick */}
                  <line
                    x1={x}
                    y1={y}
                    x2={x}
                    y2={yScale(0)}
                    stroke={dotColor}
                    strokeWidth="0.5"
                    strokeDasharray="2,3"
                    opacity="0.3"
                  />

                  {/* Dot */}
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill={dotColor}
                    stroke={pal.dotStroke}
                    strokeWidth="1"
                  />

                  {/* Ident label */}
                  <text
                    x={x}
                    y={labelAbove ? y - 10 : y + 14}
                    textAnchor="middle"
                    fill={isMajor ? pal.identMajor : pal.identMinor}
                    fontSize={isMajor ? "9" : "8"}
                    fontFamily="monospace"
                    fontWeight={isMajor ? "bold" : "normal"}
                  >
                    {type === "TOC" ? "T/C" : type === "TOD" ? "T/D" : p.ident}
                  </text>

                  {/* Altitude label for major points */}
                  {isMajor && p.alt > 0 && (
                    <text
                      x={x}
                      y={labelAbove ? y - 20 : y + 24}
                      textAnchor="middle"
                      fill={pal.altLabel}
                      fontSize="7"
                      fontFamily="monospace"
                    >
                      {formatAlt(p.alt)}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Ground line */}
            <line
              x1={padding.left}
              y1={yScale(0)}
              x2={padding.left + chartW}
              y2={yScale(0)}
              stroke={pal.groundLine}
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* Phase legend */}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-1 rounded bg-green-500 inline-block"></span> Montée
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-1 rounded bg-fuchsia-500 inline-block"></span> Croisière
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-1 rounded bg-amber-500 inline-block"></span> Descente
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
