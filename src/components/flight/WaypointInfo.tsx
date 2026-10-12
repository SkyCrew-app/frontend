"use client"

import { MapPin } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Waypoint {
  ident: string
  type: string
  lat: number
  lon: number
  alt: number
  name: string | null
}

interface WaypointInfoProps {
  waypoints: Waypoint[]
  onFocusWaypoint?: (index: number) => void
}

type BadgeVariant = "success" | "info" | "warning" | "neutral"

const TYPE_VARIANTS: Record<string, BadgeVariant> = {
  APT: "info",
  VOR: "success",
  NDB: "warning",
}

// Standard abbreviations stay as they are; the airport one gets a readable label.
const typeLabel = (type: string) => (type?.toUpperCase() === "APT" ? "Aérodrome" : type || "Point")

export function WaypointInfo({ waypoints: rawWaypoints, onFocusWaypoint }: WaypointInfoProps) {
  const waypoints = rawWaypoints || []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Points de route</CardTitle>
        <CardDescription>
          {waypoints.length > 0
            ? `${waypoints.length} point${waypoints.length > 1 ? "s" : ""}. Sélectionnez un point pour le situer sur la carte.`
            : "Ce plan de vol ne contient pas de point de route détaillé."}
        </CardDescription>
      </CardHeader>
      {waypoints.length > 0 && (
        <CardContent>
          <ol className="max-h-[420px] space-y-1 overflow-y-auto">
            {waypoints.map((waypoint, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => onFocusWaypoint?.(index)}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{waypoint.ident}</span>
                      <Badge variant={TYPE_VARIANTS[waypoint.type?.toUpperCase()] ?? "neutral"}>
                        {typeLabel(waypoint.type)}
                      </Badge>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground tabular-nums">
                      {waypoint.name && waypoint.name !== waypoint.ident ? `${waypoint.name} · ` : ""}
                      {waypoint.lat.toFixed(4)}°, {waypoint.lon.toFixed(4)}°
                      {waypoint.alt > 0 ? ` · ${waypoint.alt} ft` : ""}
                    </span>
                  </span>
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </CardContent>
      )}
    </Card>
  )
}
