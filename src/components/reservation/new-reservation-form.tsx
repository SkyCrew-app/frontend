"use client"

import { useState } from "react"
import { format, addHours, startOfHour } from "date-fns"
import { fr } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { SidePanel } from "@/components/layout/SidePanel"
import { FLIGHT_CATEGORY_LABELS, FLIGHT_CATEGORY_OPTIONS } from "@/components/reservation/flight-category"

interface Aircraft {
  id: number
  registration_number: string
  model?: string
}

export interface NewReservationValues {
  aircraftId: number
  startTime: Date
  endTime: Date
  purpose: string
  notes: string
  flightCategory: string
}

/** Values a reservation template (or anything else) can pre-fill. */
export interface NewReservationPrefill {
  aircraftId?: string
  startTime?: string
  endTime?: string
  flightCategory?: string
  purpose?: string
  notes?: string
}

interface NewReservationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aircrafts: Aircraft[]
  currentDate: Date
  prefill?: NewReservationPrefill
  isClosedDay: (date: Date) => boolean
  onSubmit: (values: NewReservationValues) => Promise<void>
  isSubmitting: boolean
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d/

const toTimeValue = (value: string | undefined, fallback: Date) =>
  value && TIME_PATTERN.test(value) ? value.slice(0, 5) : format(fallback, "HH:mm")

const withTime = (day: Date, time: string) => {
  const [hours, minutes] = time.split(":").map(Number)
  const date = new Date(day)
  date.setHours(hours, minutes, 0, 0)
  return date
}

const RequiredMark = () => (
  <span className="text-destructive" aria-hidden="true">
    *
  </span>
)

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  ) : null

/**
 * Side panel with the full reservation form (aircraft, day, times, purpose): used by the
 * "Nouvelle réservation" button on every screen size, and the only way to book on a phone.
 * Its fields are initialised when it mounts: give it a new `key` each time it is opened.
 */
export function NewReservationForm({
  open,
  onOpenChange,
  aircrafts,
  currentDate,
  prefill,
  isClosedDay,
  onSubmit,
  isSubmitting,
}: NewReservationFormProps) {
  const nextHour = addHours(startOfHour(new Date()), 1)

  const [aircraftId, setAircraftId] = useState(
    prefill?.aircraftId && aircrafts.some((a) => String(a.id) === prefill.aircraftId) ? prefill.aircraftId : "",
  )
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate)
  const [dateOpen, setDateOpen] = useState(false)
  const [startTime, setStartTime] = useState(toTimeValue(prefill?.startTime, nextHour))
  const [endTime, setEndTime] = useState(toTimeValue(prefill?.endTime, addHours(nextHour, 1)))
  const [purpose, setPurpose] = useState(prefill?.purpose ?? "")
  const [notes, setNotes] = useState(prefill?.notes ?? "")
  const [flightCategory, setFlightCategory] = useState(
    prefill?.flightCategory && FLIGHT_CATEGORY_LABELS[prefill.flightCategory] ? prefill.flightCategory : "",
  )
  const [errors, setErrors] = useState<{ aircraft?: string; date?: string; time?: string; category?: string }>({})

  const handleSubmit = async () => {
    const nextErrors: typeof errors = {}
    if (!aircraftId) nextErrors.aircraft = "Veuillez sélectionner un avion."
    if (isClosedDay(selectedDate)) nextErrors.date = "L'aéroclub est fermé ce jour-là."
    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
      nextErrors.time = "Indiquez l'heure de début et l'heure de fin."
    } else if (endTime <= startTime) {
      nextErrors.time = "L'heure de fin doit être après l'heure de début."
    }
    if (!flightCategory) nextErrors.category = "Veuillez sélectionner une catégorie de vol."

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    await onSubmit({
      aircraftId: Number.parseInt(aircraftId, 10),
      startTime: withTime(selectedDate, startTime),
      endTime: withTime(selectedDate, endTime),
      purpose,
      notes,
      flightCategory,
    })
  }

  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => {
        if (!next && isSubmitting) return
        onOpenChange(next)
      }}
      title="Nouvelle réservation"
      description="Choisissez l'avion, le jour et l'horaire de votre vol."
      onSubmit={handleSubmit}
      submitLabel="Créer la réservation"
      submitting={isSubmitting}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-reservation-aircraft">
            Avion <RequiredMark />
          </Label>
          <Select
            value={aircraftId || undefined}
            onValueChange={(value) => {
              setAircraftId(value)
              setErrors((prev) => ({ ...prev, aircraft: undefined }))
            }}
          >
            <SelectTrigger
              id="new-reservation-aircraft"
              aria-invalid={!!errors.aircraft}
              className={errors.aircraft ? "border-destructive" : ""}
            >
              <SelectValue placeholder="Sélectionner un avion" />
            </SelectTrigger>
            <SelectContent>
              {aircrafts.map((aircraft) => (
                <SelectItem key={aircraft.id} value={aircraft.id.toString()}>
                  {aircraft.registration_number}
                  {aircraft.model ? ` — ${aircraft.model}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.aircraft} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-reservation-date">
              Date <RequiredMark />
            </Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="new-reservation-date"
                  type="button"
                  variant="outline"
                  className="w-full justify-start font-normal"
                >
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{format(selectedDate, "EEE d MMM yyyy", { locale: fr })}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  defaultMonth={selectedDate}
                  onSelect={(date) => {
                    if (!date) return
                    setSelectedDate(date)
                    setErrors((prev) => ({ ...prev, date: undefined }))
                    setDateOpen(false)
                  }}
                  initialFocus
                  locale={fr}
                  disabled={isClosedDay}
                />
              </PopoverContent>
            </Popover>
            <FieldError message={errors.date} />
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="new-reservation-start">
                  Début <RequiredMark />
                </Label>
                <Input
                  id="new-reservation-start"
                  type="time"
                  step={900}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  aria-invalid={!!errors.time}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-reservation-end">
                  Fin <RequiredMark />
                </Label>
                <Input
                  id="new-reservation-end"
                  type="time"
                  step={900}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  aria-invalid={!!errors.time}
                />
              </div>
            </div>
            <FieldError message={errors.time} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-reservation-purpose">But de la réservation</Label>
          <Input
            id="new-reservation-purpose"
            placeholder="Ex. : tours de piste, navigation vers Deauville"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-reservation-category">
            Catégorie de vol <RequiredMark />
          </Label>
          <Select
            value={flightCategory || undefined}
            onValueChange={(value) => {
              setFlightCategory(value)
              setErrors((prev) => ({ ...prev, category: undefined }))
            }}
          >
            <SelectTrigger
              id="new-reservation-category"
              aria-invalid={!!errors.category}
              className={errors.category ? "border-destructive" : ""}
            >
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {FLIGHT_CATEGORY_OPTIONS.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.category} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-reservation-notes">Notes</Label>
          <Textarea
            id="new-reservation-notes"
            placeholder="Passagers, plein à prévoir, consignes particulières…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </SidePanel>
  )
}
