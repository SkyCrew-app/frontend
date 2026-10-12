"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import type { Reservation } from "@/interfaces/reservation"
import { ReservationForm } from "@/components/reservation/reservation-form"

interface ReservationEditDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  reservation: Reservation | null
  onSave: (purpose: string, notes: string, flightCategory: string) => Promise<void>
}

/** Same panel as the calendar's edit form: purpose, category and notes of a reservation. */
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
    <ReservationForm
      open={isOpen}
      onOpenChange={onOpenChange}
      title="Modifier la réservation"
      description="L'avion et l'horaire ne sont pas modifiables."
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
      isSubmitting={isSubmitting}
    />
  )
}
