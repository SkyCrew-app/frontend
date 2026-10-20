"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { CalendarX } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Reservation } from "@/interfaces/reservation"
import { canCancelReservation } from "@/lib/reservation-status"
import { NewReservationForm, type NewReservationValues } from "@/components/reservation/new-reservation-form"
import { useClubDays } from "@/components/reservation/use-club-days"

interface Aircraft {
  id: number
  registration_number: string
  model?: string
  availability_status?: string | null
  hourly_cost?: number | null
}

interface ReservationEditDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  reservation: Reservation | null
  aircrafts: Aircraft[]
  onSave: (values: NewReservationValues) => Promise<void>
  onCancelReservation: (reservation: Reservation) => void
}

/**
 * Same panel as the calendar's: the aircraft, the slot (re-priced by the API, the
 * difference shown beforehand), the purpose, the instructor, the category and the notes.
 */
export function ReservationEditDialog({
  isOpen,
  onOpenChange,
  reservation,
  aircrafts,
  onSave,
  onCancelReservation,
}: ReservationEditDialogProps) {
  const { t } = useTranslation("reservations")
  const { isClosedDay, maintenanceClash } = useClubDays()
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!reservation || !isOpen) return null

  const handleSave = async (values: NewReservationValues) => {
    setIsSubmitting(true)
    try {
      await onSave(values)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <NewReservationForm
      key={`edit-${reservation.id}`}
      open={isOpen}
      onOpenChange={onOpenChange}
      aircrafts={aircrafts}
      currentDate={new Date(reservation.start_time)}
      isClosedDay={isClosedDay}
      maintenanceClash={maintenanceClash}
      onSubmit={handleSave}
      isSubmitting={isSubmitting}
      editing={reservation}
      pilotId={reservation.user?.id}
      footerStart={
        canCancelReservation(reservation) ? (
          <Button
            type="button"
            variant="outline"
            // A destructive action of its own: outlined in red, on its own row on a phone.
            className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
            disabled={isSubmitting}
            onClick={() => onCancelReservation(reservation)}
          >
            <CalendarX className="h-4 w-4" />
            {t("cancel.action")}
          </Button>
        ) : undefined
      }
    />
  )
}
