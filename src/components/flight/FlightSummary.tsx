"use client"

import type { ReactNode } from "react"
import { Plane } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatDecimal } from "@/lib/format"
import type { Weather } from "@/interfaces/weather"

interface SummaryAirport {
  icao: string
  name?: string
  /** Already formatted, e.g. "14:30". */
  time: string
  weather?: Weather
}

interface FlightSummaryProps {
  departure: SummaryAirport
  arrival: SummaryAirport
  /** Already formatted, e.g. "1 h 20". */
  duration?: string
  distanceKm?: number | null
  /** Key facts shown under the route (date, aircraft, passengers…). */
  facts: { label: string; value: ReactNode }[]
}

const KM_PER_NM = 1.852

function Airport({ label, airport, align }: { label: string; airport: SummaryAirport; align: "left" | "right" }) {
  return (
    <div className={align === "right" ? "md:text-right" : undefined}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{airport.icao}</p>
      {airport.name && airport.name !== airport.icao && (
        <p className="truncate text-sm text-muted-foreground">{airport.name}</p>
      )}
      <p className="mt-1 text-sm font-medium tabular-nums">{airport.time}</p>
      {airport.weather && (
        <p className="text-xs text-muted-foreground">
          {formatDecimal(airport.weather.temperature, 0)} °C, {airport.weather.conditions}
        </p>
      )}
    </div>
  )
}

/** Route and key facts of a flight plan, shown once at the top of its page. */
export function FlightSummary({ departure, arrival, duration, distanceKm, facts }: FlightSummaryProps) {
  const routeFacts = [
    duration,
    distanceKm ? `${formatDecimal(distanceKm, 0)} km (${formatDecimal(distanceKm / KM_PER_NM, 0)} NM)` : null,
  ].filter(Boolean)

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
          <Airport label="Départ" airport={departure} align="left" />

          <div className="flex flex-col items-center gap-2">
            <div className="flex w-full items-center gap-2" aria-hidden="true">
              <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
              <span className="h-px flex-1 bg-border" />
              <Plane className="h-4 w-4 shrink-0 rotate-45 text-primary" />
              <span className="h-px flex-1 bg-border" />
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
            </div>
            {routeFacts.length > 0 && (
              <p className="text-center text-sm text-muted-foreground tabular-nums">{routeFacts.join(" · ")}</p>
            )}
          </div>

          <Airport label="Arrivée" airport={arrival} align="right" />
        </div>

        {facts.length > 0 && (
          <dl className="grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                <dd className="truncate text-sm font-medium tabular-nums">{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
