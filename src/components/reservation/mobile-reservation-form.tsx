"use client"

import { useState } from "react"
import { format, addHours } from "date-fns"
import { fr } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { TimePickerDemo } from "@/components/ui/time-picker"
import { Loader2, CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

interface Aircraft {
  id: number
  registration_number: string
}

interface MobileReservationFormProps {
  aircrafts: Aircraft[]
  currentDate: Date
  purpose: string
  setPurpose: (value: string) => void
  notes: string
  setNotes: (value: string) => void
  flightCategory: string
  setFlightCategory: (value: string) => void
  onSubmit: (aircraftId: number, startTime: Date, endTime: Date) => Promise<void>
  isSubmitting: boolean
  disabledDays: string[]
}

export function MobileReservationForm({
  aircrafts,
  currentDate,
  purpose,
  setPurpose,
  notes,
  setNotes,
  flightCategory,
  setFlightCategory,
  onSubmit,
  isSubmitting,
  disabledDays,
}: MobileReservationFormProps) {
  const t = useTranslations("reservation")

  const flightCategoryMapping = {
    LOCAL: t('local'),
    CROSS_COUNTRY: t('crossCountry'),
    INSTRUCTION: t('instruction'),
    TOURISM: t('tourism'),
    TRAINING: t('training'),
    MAINTENANCE: t('maintenance'),
    PRIVATE: t('private'),
    CORPORATE: t('corporate'),
  }

  const flightCategoryReverseMapping = Object.fromEntries(
    Object.entries(flightCategoryMapping).map(([key, value]) => [value, key]),
  )

  const [selectedAircraftId, setSelectedAircraftId] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate)
  const [startTime, setStartTime] = useState<Date>(new Date())
  const [endTime, setEndTime] = useState<Date>(addHours(new Date(), 1))
  const [selectedCategoryFr, setSelectedCategoryFr] = useState<string | undefined>(
    flightCategory ? flightCategoryMapping[flightCategory as keyof typeof flightCategoryMapping] : undefined,
  )

  // Modifier la fonction handleSubmit pour éviter les mises à jour d'état inutiles
  const handleSubmit = async () => {
    if (!selectedAircraftId) {
      alert(t('errorSelectAircraft'))
      return
    }

    // Créer des dates complètes avec la date et l'heure
    const startDateTime = new Date(selectedDate)
    startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0)

    const endDateTime = new Date(selectedDate)
    endDateTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0)

    // Vérifier que l'heure de fin est après l'heure de début
    if (endDateTime <= startDateTime) {
      alert(t('errorSelectDate'))
      return
    }

    try {
      await onSubmit(Number.parseInt(selectedAircraftId), startDateTime, endDateTime)
    } catch (error) {
      console.error("Erreur lors de la création de la réservation:", error)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="aircraft">{t('aircraft')}</Label>
        <Select value={selectedAircraftId} onValueChange={setSelectedAircraftId}>
          <SelectTrigger id="aircraft">
            <SelectValue placeholder={t('selectPlane')} />
          </SelectTrigger>
          <SelectContent>
            {aircrafts.map((aircraft) => (
              <SelectItem key={aircraft.id} value={aircraft.id.toString()}>
                {aircraft.registration_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="date">{t('date')}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant="outline"
              className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? (
                format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })
              ) : (
                <span>{t('selectDate')}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
              locale={fr}
              disabled={(date) => {
                const dayName = format(date, "EEEE", { locale: fr })
                return disabledDays.includes(dayName)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start-time">{t('startTime')}</Label>
          <TimePickerDemo date={startTime} setDate={setStartTime} />
        </div>
        <div>
          <Label htmlFor="end-time">{t('endTime')}</Label>
          <TimePickerDemo date={endTime} setDate={setEndTime} />
        </div>
      </div>

      <div>
        <Label htmlFor="purpose">{t('reservationPurpose')}</Label>
        <Input
          id="purpose"
          placeholder={t('purposeExample')}
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="category">{t('flightCategory')}</Label>
        <Select
          value={selectedCategoryFr}
          onValueChange={(value) => {
            setSelectedCategoryFr(value)
            setFlightCategory(flightCategoryReverseMapping[value])
          }}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder={t('selectCategory')} />
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

      <div>
        <Label htmlFor="notes">{t('notes')}</Label>
        <Textarea
          id="notes"
          placeholder={t('notesExample')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('submitReservation')}
      </Button>
    </div>
  )
}
