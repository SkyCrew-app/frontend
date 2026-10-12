"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarCheck, ChevronRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { EmptyState } from "@/components/layout/EmptyState"
import type { Reservation } from "@/interfaces/reservation"
import { reservationStatus } from "@/lib/reservation-status"
import { formatTime } from "@/lib/format"
import { reservationPilotName } from "@/components/reservation/reservation-cell"

interface Aircraft {
  id: number
  registration_number: string
  model?: string
}

interface MobileReservationViewProps {
  currentDate: Date
  aircrafts: Aircraft[]
  reservations: Reservation[]
  selectedAircraft: number | null
  setSelectedAircraft: (id: number | null) => void
  currentUserId?: string | number | null
  onViewReservation: (reservation: Reservation) => void
}

const ALL_AIRCRAFT = "all"

/** Day agenda for phones: the reservations of the day, optionally for one aircraft. */
export function MobileReservationView({
  currentDate,
  aircrafts,
  reservations,
  selectedAircraft,
  setSelectedAircraft,
  currentUserId,
  onViewReservation,
}: MobileReservationViewProps) {
  const filteredReservations = selectedAircraft
    ? reservations.filter((r) => String(r.aircraft.id) === String(selectedAircraft))
    : reservations

  const sortedReservations = [...filteredReservations].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  )

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="aircraft-select">Avion</Label>
        <Select
          value={selectedAircraft?.toString() ?? ALL_AIRCRAFT}
          onValueChange={(value) => setSelectedAircraft(value === ALL_AIRCRAFT ? null : Number.parseInt(value, 10))}
        >
          <SelectTrigger id="aircraft-select">
            <SelectValue placeholder="Tous les avions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_AIRCRAFT}>Tous les avions</SelectItem>
            {aircrafts.map((aircraft) => (
              <SelectItem key={aircraft.id} value={aircraft.id.toString()}>
                {aircraft.registration_number}
                {aircraft.model ? ` — ${aircraft.model}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <h2 className="text-lg font-semibold">Réservations du {format(currentDate, "EEEE d MMMM yyyy", { locale: fr })}</h2>

      {sortedReservations.length > 0 ? (
        <ul className="space-y-2">
          {sortedReservations.map((reservation) => {
            const status = reservationStatus(reservation.status)
            const isMine =
              currentUserId != null && reservation.user?.id != null && String(currentUserId) === String(reservation.user.id)
            const pilot = isMine ? "Vous" : reservationPilotName(reservation)

            return (
              <li key={reservation.id}>
                <button
                  type="button"
                  onClick={() => onViewReservation(reservation)}
                  className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatTime(reservation.start_time)} – {formatTime(reservation.end_time)}
                      </span>
                      <span className="text-sm font-medium">{reservation.aircraft.registration_number}</span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {[reservation.purpose || "Réservation", pilot].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState
          icon={CalendarCheck}
          title={selectedAircraft ? "Cet avion est libre toute la journée" : "Aucune réservation ce jour"}
          description="Utilisez « Nouvelle réservation » pour réserver un créneau."
        />
      )}
    </div>
  )
}
