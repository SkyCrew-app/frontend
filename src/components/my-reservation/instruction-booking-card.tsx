"use client"

import { useTranslation } from "react-i18next"
import { CalendarClock, CalendarX, FileText, GraduationCap } from "lucide-react"
import { canCancelReservation, reservationStatus } from "@/lib/reservation-status"
import { formatDate, formatFlightDuration, formatTime } from "@/lib/format"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Reservation } from "@/interfaces/reservation"
import { reservationPilotName } from "@/components/reservation/reservation-cell"

interface InstructionBookingCardProps {
  reservation: Reservation
  /** Asks to decline the booking; the page confirms before anything is sent. */
  onDecline: (reservation: Reservation) => void
}

/** A booking the signed-in member instructs: who the student is, on which aircraft and when. */
export function InstructionBookingCard({ reservation, onDecline }: InstructionBookingCardProps) {
  const { t } = useTranslation("reservations")
  const startDate = new Date(reservation.start_time)
  const endDate = new Date(reservation.end_time)
  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
  const status = reservationStatus(reservation.status)

  return (
    <Card className="flex h-full flex-col" data-instruction-booking>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{reservation.aircraft.registration_number}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("my.instruction.cardSubtitle")}</p>
        </div>
        <Badge variant={status.variant} className="shrink-0">
          {status.label}
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 pb-4 text-sm">
        <p className="flex items-start gap-2">
          <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>
            <span className="text-muted-foreground">{t("common:labels.student")} · </span>
            {reservationPilotName(reservation) || "—"}
          </span>
        </p>
        <p className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="tabular-nums">
            {formatDate(startDate)} · {formatTime(startDate)} – {formatTime(endDate)}
            <span className="text-muted-foreground"> · {formatFlightDuration(durationHours)}</span>
          </span>
        </p>
        {reservation.purpose && (
          <p className="flex items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="line-clamp-2">{reservation.purpose}</span>
          </p>
        )}
      </CardContent>
      {canCancelReservation(reservation) && (
        <CardFooter className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onDecline(reservation)}
          >
            <CalendarX className="h-4 w-4" />
            {t("my.instruction.decline")}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
