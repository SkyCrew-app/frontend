"use client"

import Link from "next/link"
import { CalendarClock, Pencil, Plane, Route } from "lucide-react"
import { formatDate, formatDecimal, formatFlightDuration, formatTime } from "@/lib/format"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Flight } from "@/interfaces/flight"
import { flightTypeLabel } from "@/components/flight/flight-type"
import { flightPlanState } from "@/components/flight-plan/flight-plan-state"

interface FlightPlanCardProps {
  flight: Flight
  onEdit: (flight: Flight) => void
}

export function FlightPlanCard({ flight, onEdit }: FlightPlanCardProps) {
  const state = flightPlanState(flight)
  const reservation = flight.reservation
  const passengers = flight.number_of_passengers ?? 0

  const routeFacts = [
    flight.distance_km ? `${formatDecimal(flight.distance_km, 0)} km` : null,
    flight.flight_hours ? formatFlightDuration(flight.flight_hours) : null,
    `${passengers} passager${passengers > 1 ? "s" : ""}`,
  ].filter(Boolean)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">
            {flight.origin_icao} → {flight.destination_icao}
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{flightTypeLabel(flight.flight_type)}</p>
        </div>
        <Badge variant={state.variant} className="shrink-0">
          {state.label}
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 pb-4 text-sm">
        {reservation ? (
          <>
            <p className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="tabular-nums">
                {formatDate(reservation.start_time)} · {formatTime(reservation.start_time)} –{" "}
                {formatTime(reservation.end_time)}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <Plane className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              {reservation.aircraft.registration_number}
            </p>
          </>
        ) : (
          <p className="flex items-start gap-2 text-muted-foreground">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Sans réservation associée
          </p>
        )}
        <p className="flex items-start gap-2">
          <Route className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="tabular-nums">{routeFacts.join(" · ")}</span>
        </p>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2 border-t pt-4">
        {!flight.closed_at && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              onClick={() => onEdit(flight)}
              aria-label={`Modifier le plan de vol ${flight.origin_icao} → ${flight.destination_icao}`}
              title="Modifier"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/close_flight/${flight.id}`}>Clôturer le vol</Link>
            </Button>
          </>
        )}
        <Button size="sm" asChild>
          <Link href={`/reservations/flight-plans/${flight.id}`}>Ouvrir</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
