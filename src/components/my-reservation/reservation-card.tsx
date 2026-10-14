"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { CalendarClock, CalendarX, FileText, GraduationCap, Pencil, Wallet } from "lucide-react"
import { instructorName } from "@/components/reservation/instructor-field"
import { canCancelReservation, canEditReservation, reservationStatus } from "@/lib/reservation-status"
import { formatDate, formatFlightDuration, formatMoney, formatTime } from "@/lib/format"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Reservation } from "@/interfaces/reservation"
import { flightCategoryLabel } from "@/components/reservation/flight-category"

interface ReservationCardProps {
  reservation: Reservation
  onEdit: (reservation: Reservation) => void
  /** Asks to cancel the booking; the page confirms before anything is sent. */
  onCancel: (reservation: Reservation) => void
}

export function ReservationCard({ reservation, onEdit, onCancel }: ReservationCardProps) {
  const { t } = useTranslation("reservations")
  const startDate = new Date(reservation.start_time)
  const endDate = new Date(reservation.end_time)
  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
  const status = reservationStatus(reservation.status)
  const flightPlanId = reservation.flights?.[0]?.id
  const isCancelled = String(reservation.status).toUpperCase() === "CANCELLED"
  const instructor = instructorName(reservation.instructor)
  const canCancel = canCancelReservation(reservation)
  const canEdit = canEditReservation(reservation)
  const showPlanAction = !!flightPlanId || !isCancelled

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
            <span className="text-muted-foreground">{t("my.card.noPurpose")}</span>
          )}
        </p>
        {instructor && (
          <p className="flex items-start gap-2">
            <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              <span className="text-muted-foreground">{t("common:labels.instructor")} · </span>
              {instructor}
            </span>
          </p>
        )}
        {reservation.charged_amount != null && (
          <p className="flex items-start gap-2">
            <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              <span className="text-muted-foreground">{t("shared.pricePaid")} · </span>
              <span className="tabular-nums">{formatMoney(Number(reservation.charged_amount))}</span>
            </span>
          </p>
        )}
      </CardContent>
      {(canCancel || canEdit || showPlanAction) && (
        <CardFooter className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          {canCancel && (
            // Icon only: three labelled buttons do not fit a card of the three-column grid.
            <Button
              size="icon"
              variant="ghost"
              className="mr-auto h-9 w-9 text-destructive hover:text-destructive"
              onClick={() => onCancel(reservation)}
              aria-label={t("cancel.actionFor", { aircraft: reservation.aircraft.registration_number })}
              title={t("cancel.action")}
            >
              <CalendarX className="h-4 w-4" />
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => onEdit(reservation)}>
              <Pencil className="h-4 w-4" />
              {t("common:actions.edit")}
            </Button>
          )}
          {flightPlanId ? (
            <Button size="sm" asChild>
              <Link href={`/reservations/flight-plans/${flightPlanId}`}>{t("my.card.viewFlightPlan")}</Link>
            </Button>
          ) : (
            !isCancelled && (
              <Button size="sm" asChild>
                <Link href={`/reservations/flight-plans/create/${reservation.id}`}>{t("my.card.createFlightPlan")}</Link>
              </Button>
            )
          )}
        </CardFooter>
      )}
    </Card>
  )
}
