"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { useTranslation } from "react-i18next"
import { CalendarX } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Reservation } from "@/interfaces/reservation"
import { canCancelReservation } from "@/lib/reservation-status"
import { ReservationForm } from "@/components/reservation/reservation-form"
import { dateFnsLocale } from "@/lib/i18n"

interface ReservationEditDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  reservation: Reservation | null
  onSave: (purpose: string, notes: string, flightCategory: string) => Promise<void>
  onCancelReservation: (reservation: Reservation) => void
}

/** Same panel as the calendar's edit form: purpose, category and notes of a reservation. */
export function ReservationEditDialog({
  isOpen,
  onOpenChange,
  reservation,
  onSave,
  onCancelReservation,
}: ReservationEditDialogProps) {
  const { t } = useTranslation("reservations")
  const [purpose, setPurpose] = useState("")
  const [notes, setNotes] = useState("")
  const [flightCategory, setFlightCategory] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (reservation && isOpen) {
      setPurpose(reservation.purpose || "")
      setNotes(reservation.notes || "")
      setFlightCategory(reservation.flight_category || "")
    }
  }, [reservation, isOpen])

  const handleSave = async () => {
    if (!reservation) return

    setIsSubmitting(true)
    try {
      await onSave(purpose, notes, flightCategory)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!reservation) return null

  return (
    <ReservationForm
      open={isOpen}
      onOpenChange={onOpenChange}
      title={t("form.editTitle")}
      description={t("form.editDescription")}
      isEdit
      summary={{
        aircraft: reservation.aircraft.registration_number,
        date: format(new Date(reservation.start_time), "EEEE d MMMM yyyy", { locale: dateFnsLocale() }),
        start: format(new Date(reservation.start_time), "HH:mm"),
        end: format(new Date(reservation.end_time), "HH:mm"),
      }}
      purpose={purpose}
      setPurpose={setPurpose}
      notes={notes}
      setNotes={setNotes}
      flightCategory={flightCategory}
      setFlightCategory={setFlightCategory}
      onSubmit={handleSave}
      isSubmitting={isSubmitting}
      footerStart={
        canCancelReservation(reservation) ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={isSubmitting}
            onClick={() => onCancelReservation(reservation)}
          >
            <CalendarX className="h-4 w-4" />
            {t("my.card.cancel")}
          </Button>
        ) : undefined
      }
    />
  )
}
