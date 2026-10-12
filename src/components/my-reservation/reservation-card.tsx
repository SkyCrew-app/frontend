"use client"

import Link from "next/link"
import { CalendarClock, FileText, Pencil } from "lucide-react"
import { reservationStatus } from "@/lib/reservation-status"
import { formatDate, formatFlightDuration, formatTime } from "@/lib/format"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Reservation } from "@/interfaces/reservation"
import { flightCategoryLabel } from "@/components/reservation/flight-category"

interface ReservationCardProps {
  reservation: Reservation
  onEdit: (reservation: Reservation) => void
}

export function ReservationCard({ reservation, onEdit }: ReservationCardProps) {
  const startDate = new Date(reservation.start_time)
  const endDate = new Date(reservation.end_time)
  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
  const status = reservationStatus(reservation.status)
  const flightPlanId = reservation.flights?.[0]?.id
  const isCancelled = String(reservation.status).toUpperCase() === "CANCELLED"

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{reservation.aircraft.registration_number}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{flightCategoryLabel(reservation.flight_category)}</p>
        </div>
        <Badge variant={status.variant} className="shrink-0">
          {status.label}
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 pb-4 text-sm">
        <p className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="tabular-nums">
            {formatDate(startDate)} · {formatTime(startDate)} – {formatTime(endDate)}
            <span className="text-muted-foreground"> · {formatFlightDuration(durationHours)}</span>
          </span>
        </p>
        <p className="flex items-start gap-2">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {reservation.purpose ? (
            <span className="line-clamp-2">{reservation.purpose}</span>
          ) : (
            <span className="text-muted-foreground">But non précisé</span>
          )}
        </p>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button size="sm" variant="outline" onClick={() => onEdit(reservation)}>
          <Pencil className="h-4 w-4" />
          Modifier
        </Button>
        {flightPlanId ? (
          <Button size="sm" asChild>
            <Link href={`/reservations/flight-plans/${flightPlanId}`}>Voir le plan de vol</Link>
          </Button>
        ) : (
          !isCancelled && (
            <Button size="sm" asChild>
              <Link href={`/reservations/flight-plans/create/${reservation.id}`}>Créer un plan de vol</Link>
            </Button>
          )
        )}
      </CardFooter>
    </Card>
  )
}
