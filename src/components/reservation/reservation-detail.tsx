"use client"

import { useState } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import { reservationStatus } from "@/lib/reservation-status"
import { formatDate, formatFlightDuration, formatTime } from "@/lib/format"
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

interface ReservationDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservation: Reservation
  onEdit: () => void
  onDelete: () => Promise<void> | void
  canEdit: boolean
}

/** Read-only side panel of a reservation; its owner can edit or delete it from the footer. */
export function ReservationDetail({
  open,
  onOpenChange,
  reservation,
  onEdit,
  onDelete,
  canEdit,
}: ReservationDetailProps) {
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

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Détails de la réservation"
      size="md"
      footerStart={
        canEdit ? (
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        ) : undefined
      }
      footer={
        canEdit ? (
          <Button variant="outline" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Modifier
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold leading-tight">{reservation.purpose || "Réservation"}</h3>
          <Badge variant={status.variant} className="shrink-0">
            {status.label}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Avion</dt>
            <dd className="font-medium">{reservation.aircraft.registration_number}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Pilote</dt>
            <dd className="font-medium">{pilot || "—"}</dd>
            {reservation.user?.email && <dd className="text-xs text-muted-foreground">{reservation.user.email}</dd>}
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Date</dt>
            <dd className="font-medium">
              {format(new Date(reservation.start_time), "EEEE d MMMM yyyy", {
                locale: fr,
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Horaire</dt>
            <dd className="font-medium tabular-nums">{timeRange}</dd>
            <dd className="text-xs text-muted-foreground">
              {formatFlightDuration(reservationDurationHours(reservation))}
            </dd>
          </div>
          {reservation.flight_category && (
            <div>
              <dt className="text-xs text-muted-foreground">Catégorie de vol</dt>
              <dd className="font-medium">{flightCategoryLabel(reservation.flight_category)}</dd>
            </div>
          )}
          {reservation.notes && (
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">Notes</dt>
              <dd className="whitespace-pre-wrap">{reservation.notes}</dd>
            </div>
          )}
        </dl>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette réservation ?</AlertDialogTitle>
              <AlertDialogDescription>
                La réservation de {reservation.aircraft.registration_number} du {formatDate(reservation.start_time)}, de{" "}
                {formatTime(reservation.start_time)} à {formatTime(reservation.end_time)}, sera définitivement supprimée
                et le créneau redeviendra libre.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
                onClick={(event) => {
                  event.preventDefault()
                  void handleConfirmDelete()
                }}
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Supprimer la réservation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidePanel>
  )
}
