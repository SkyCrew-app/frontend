"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { CalendarClock, Pencil, Plane, Route } from "lucide-react"
import { formatDate, formatDateTime, formatDecimal, formatFlightDuration, formatTime } from "@/lib/format"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Flight } from "@/interfaces/flight"
import { flightTypeLabel } from "@/components/flight/flight-type"
import { flightPlanState } from "@/components/flight-plan/flight-plan-state"
import { closeBlocker } from "@/lib/flight-closing"

interface FlightPlanCardProps {
  flight: Flight
  onEdit: (flight: Flight) => void
}

export function FlightPlanCard({ flight, onEdit }: FlightPlanCardProps) {
  const { t } = useTranslation("flights")
  const state = flightPlanState(flight)
  // The API only closes a flight once its booking has started.
  const blocker = closeBlocker(flight)
  const reservation = flight.reservation
  const passengers = flight.number_of_passengers ?? 0

  const routeFacts = [
    flight.distance_km ? `${formatDecimal(flight.distance_km, 0)} km` : null,
    flight.flight_hours ? formatFlightDuration(flight.flight_hours) : null,
    t("plans.card.passengers", { count: passengers }),
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
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={state.variant}>{state.label}</Badge>
          {flight.plan_engine === "legacy" && <Badge variant="neutral">{t("navplan:detail.legacyBadge")}</Badge>}
        </div>
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
            {t("plans.card.noReservation")}
          </p>
        )}
        <p className="flex items-start gap-2">
          <Route className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="tabular-nums">{routeFacts.join(" · ")}</span>
        </p>
        {blocker === "notStarted" && reservation && (
          <p className="text-xs text-muted-foreground">
            {t("plans.card.closeFrom", { date: formatDateTime(reservation.start_time) })}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2 border-t pt-4">
        {!flight.closed_at && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              onClick={() => onEdit(flight)}
              aria-label={t("plans.card.editLabel", { origin: flight.origin_icao, destination: flight.destination_icao })}
              title={t("common:actions.edit")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {blocker === null && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/close_flight/${flight.id}`}>{t("plans.actions.closeFlight")}</Link>
              </Button>
            )}
          </>
        )}
        <Button size="sm" asChild>
          <Link href={`/reservations/flight-plans/${flight.id}`}>{t("common:actions.open")}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
