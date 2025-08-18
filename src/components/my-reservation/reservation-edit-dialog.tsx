"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Loader2 } from "lucide-react"
import type { Reservation } from "@/interfaces/reservation"
import { useTranslations } from "next-intl"

interface ReservationEditDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  reservation: Reservation | null
  onSave: (purpose: string, notes: string, flightCategory: string) => Promise<void>
  flightCategoryMapping: Record<string, string>
  flightCategoryReverseMapping: Record<string, string>
}

export function ReservationEditDialog({
  isOpen,
  onOpenChange,
  reservation,
  onSave,
  flightCategoryMapping,
  flightCategoryReverseMapping,
}: ReservationEditDialogProps) {
  const t = useTranslations("reservation")
  const [purpose, setPurpose] = useState("")
  const [notes, setNotes] = useState("")
  const [flightCategory, setFlightCategory] = useState("")
  const [selectedCategoryFr, setSelectedCategoryFr] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (reservation) {
      setPurpose(reservation.purpose || "")
      setNotes(reservation.notes || "")
      setFlightCategory(reservation.flight_category || "")
      setSelectedCategoryFr(flightCategoryMapping[reservation.flight_category] || "")
    }
  }, [reservation, flightCategoryMapping])

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogTitle>{t('editReservation')}</DialogTitle>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-2">
            <Label>{t('plane')}</Label>
            <div className="p-2 bg-muted rounded-md">{reservation.aircraft.registration_number}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('start')}</Label>
              <div className="p-2 bg-muted rounded-md text-sm">
                {format(new Date(reservation.start_time), "PPP", { locale: fr })}
                <br />
                {format(new Date(reservation.start_time), "HH:mm", { locale: fr })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('end')}</Label>
              <div className="p-2 bg-muted rounded-md text-sm">
                {format(new Date(reservation.end_time), "PPP", { locale: fr })}
                <br />
                {format(new Date(reservation.end_time), "HH:mm", { locale: fr })}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">{t('reservationPurpose')}</Label>
            <Input
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder={t('reservationPurpose')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t('flightCategory')}</Label>
            <Select
              value={selectedCategoryFr}
              onValueChange={(value) => {
                setSelectedCategoryFr(value)
                setFlightCategory(flightCategoryReverseMapping[value])
              }}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder={t('flightCategory')} />
              </SelectTrigger>
              <SelectContent>
                {Object.values(flightCategoryMapping).map((categoryFr) => (
                  <SelectItem key={categoryFr} value={categoryFr}>
                    {categoryFr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('notes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notesExample')}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
