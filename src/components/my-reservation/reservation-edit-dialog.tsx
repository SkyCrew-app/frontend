"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Reservation } from "@/interfaces/reservation"
import { ReservationForm } from "@/components/reservation/reservation-form"

interface ReservationEditDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  reservation: Reservation | null
  onSave: (purpose: string, notes: string, flightCategory: string) => Promise<void>
}

/** Same form as the calendar's edit dialog: purpose, category and notes of a reservation. */
export function ReservationEditDialog({ isOpen, onOpenChange, reservation, onSave }: ReservationEditDialogProps) {
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier la réservation</DialogTitle>
          <DialogDescription>L&apos;avion et l&apos;horaire ne sont pas modifiables.</DialogDescription>
        </DialogHeader>
        <ReservationForm
          isEdit
          summary={{
            aircraft: reservation.aircraft.registration_number,
            date: format(new Date(reservation.start_time), "EEEE d MMMM yyyy", { locale: fr }),
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
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  )
}
