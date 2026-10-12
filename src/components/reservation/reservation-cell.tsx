"use client"

import { TableCell } from "@/components/ui/table"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import type { Reservation } from "@/interfaces/reservation"
import { Clock, User, FileText, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatFlightDuration, formatTime } from "@/lib/format"
import { reservationStatus } from "@/lib/reservation-status"
import { reservationBlockClass } from "@/components/reservation/status-style"
import { flightCategoryLabel } from "@/components/reservation/flight-category"

interface ReservationCellProps {
  reservation: Reservation
  colSpan: number
  /** True when the reservation belongs to the signed-in user. */
  isMine?: boolean
  onClick: () => void
}

export const reservationPilotName = (reservation: Reservation) =>
  [reservation.user?.first_name, reservation.user?.last_name].filter(Boolean).join(" ")

export const reservationDurationHours = (reservation: Reservation) =>
  (new Date(reservation.end_time).getTime() - new Date(reservation.start_time).getTime()) / 3600000

export function ReservationCell({ reservation, colSpan, isMine = false, onClick }: ReservationCellProps) {
  const status = reservationStatus(reservation.status)
  const pilot = isMine ? "Vous" : reservationPilotName(reservation)
  const timeRange = `${formatTime(reservation.start_time)} – ${formatTime(reservation.end_time)}`

  return (
    <TableCell
      colSpan={colSpan}
      className={cn("h-12 p-0 font-medium transition-colors", reservationBlockClass(reservation.status))}
    >
      <HoverCard openDelay={300}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className="flex h-12 w-full flex-col items-start justify-center px-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <span className="w-full truncate text-sm leading-tight">{reservation.purpose || "Réservation"}</span>
            {pilot && <span className="w-full truncate text-xs font-normal leading-tight opacity-80">{pilot}</span>}
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-72 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{reservation.purpose || "Réservation"}</p>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <ul className="space-y-1.5 text-sm text-foreground">
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="tabular-nums">
                {timeRange} · {formatFlightDuration(reservationDurationHours(reservation))}
              </span>
            </li>
            {pilot && (
              <li className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {pilot}
              </li>
            )}
            {reservation.flight_category && (
              <li className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {flightCategoryLabel(reservation.flight_category)}
              </li>
            )}
            {reservation.notes && (
              <li className="flex items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="line-clamp-3">{reservation.notes}</span>
              </li>
            )}
          </ul>
        </HoverCardContent>
      </HoverCard>
    </TableCell>
  )
}
