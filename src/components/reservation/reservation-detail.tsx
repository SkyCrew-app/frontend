"use client"

import { useState } from "react"
import { format } from "date-fns"
import { useTranslation } from "react-i18next"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import {
  canCancelReservation,
  canEditReservation,
  hasReservationStarted,
  reservationStatus,
} from "@/lib/reservation-status"
import { formatDate, formatFlightDuration, formatMoney, formatTime } from "@/lib/format"
import { dateFnsLocale } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Reservation } from "@/interfaces/reservation"
import { flightCategoryLabel } from "@/components/reservation/flight-category"
import { reservationDurationHours, reservationPilotName } from "@/components/reservation/reservation-cell"
import { SidePanel } from "@/components/layout/SidePanel"
import { instructorName } from "@/components/reservation/instructor-field"

interface ReservationDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservation: Reservation
  onEdit: () => void
  onDelete: () => Promise<void> | void
  canEdit: boolean
  /** An administrator may cancel any booking, even once it has started. */
  isAdmin?: boolean
  /** The signed-in member is the instructor of this booking: they may decline it before it starts. */
  isInstructor?: boolean
}

/** Read-only side panel of a reservation; its owner can edit or delete it from the footer. */
export function ReservationDetail({
  open,
  onOpenChange,
  reservation,
  onEdit,
  onDelete,
  canEdit,
  isAdmin = false,
  isInstructor = false,
}: ReservationDetailProps) {
  const { t } = useTranslation("reservations")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const status = reservationStatus(reservation.status)
  const pilot = reservationPilotName(reservation)
  const timeRange = `${formatTime(reservation.start_time)} – ${formatTime(reservation.end_time)}`

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete()
    } finally {
      setIsDeleting(false)
      setConfirmOpen(false)
    }
  }

  // The API decides; these are the same rules, so that nothing it would refuse is offered:
  // a booking is changed before it starts, cancelled by its holder until then and by an
  // administrator afterwards, and kept for good once its flight is closed.
  const canChange = canEdit && canEditReservation(reservation)
  // Its instructor declines it under the same rule as its holder: before it starts.
  const canDelete = (canEdit || isAdmin || isInstructor) && canCancelReservation(reservation, { isAdmin })
  const declines = isInstructor && !canEdit && !isAdmin
  const instructor = instructorName(reservation.instructor)
  const showStartedHint = canEdit && !canChange && !isAdmin && hasReservationStarted(reservation)
  const showPrice = (canEdit || isAdmin) && reservation.charged_amount != null

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t("detail.title")}
      size="md"
      footerStart={
        canDelete ? (
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            {declines ? t("detail.decline") : t("common:actions.delete")}
          </Button>
        ) : undefined
      }
      footer={
        canChange ? (
          <Button variant="outline" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            {t("common:actions.edit")}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold leading-tight">{reservation.purpose || t("shared.untitled")}</h3>
          <Badge variant={status.variant} className="shrink-0">
            {status.label}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{t("common:labels.aircraft")}</dt>
            <dd className="font-medium">{reservation.aircraft.registration_number}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("common:labels.pilot")}</dt>
            <dd className="font-medium">{pilot || "—"}</dd>
            {reservation.user?.email && <dd className="text-xs text-muted-foreground">{reservation.user.email}</dd>}
          </div>
          {instructor && (
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">{t("common:labels.instructor")}</dt>
              <dd className="font-medium">{instructor}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted-foreground">{t("common:labels.date")}</dt>
            <dd className="font-medium">
              {format(new Date(reservation.start_time), "EEEE d MMMM yyyy", {
                locale: dateFnsLocale(),
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("detail.schedule")}</dt>
            <dd className="font-medium tabular-nums">{timeRange}</dd>
            <dd className="text-xs text-muted-foreground">
              {formatFlightDuration(reservationDurationHours(reservation))}
            </dd>
          </div>
          {reservation.flight_category && (
            <div>
              <dt className="text-xs text-muted-foreground">{t("shared.flightCategory")}</dt>
              <dd className="font-medium">{flightCategoryLabel(reservation.flight_category)}</dd>
            </div>
          )}
          {showPrice && (
            <div>
              <dt className="text-xs text-muted-foreground">{t("shared.pricePaid")}</dt>
              <dd className="font-medium tabular-nums">{formatMoney(Number(reservation.charged_amount))}</dd>
            </div>
          )}
          {reservation.notes && (
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">{t("common:labels.notes")}</dt>
              <dd className="whitespace-pre-wrap">{reservation.notes}</dd>
            </div>
          )}
        </dl>

        {showStartedHint && <p className="text-sm text-muted-foreground">{t("detail.startedHint")}</p>}
        {declines && canDelete && <p className="text-sm text-muted-foreground">{t("detail.instructorHint")}</p>}

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {declines ? t("detail.declineConfirm.title") : t("detail.deleteConfirm.title")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(declines ? "detail.declineConfirm.description" : "detail.deleteConfirm.description", {
                  aircraft: reservation.aircraft.registration_number,
                  date: formatDate(reservation.start_time),
                  start: formatTime(reservation.start_time),
                  end: formatTime(reservation.end_time),
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>{t("common:actions.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
                onClick={(event) => {
                  event.preventDefault()
                  void handleConfirmDelete()
                }}
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {declines ? t("detail.declineConfirm.action") : t("detail.deleteConfirm.action")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidePanel>
  )
}
