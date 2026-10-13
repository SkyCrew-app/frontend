"use client"

import { useState } from "react"
import { format, addHours, startOfHour } from "date-fns"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { SidePanel } from "@/components/layout/SidePanel"
import { flightCategoryOptions, isFlightCategory } from "@/components/reservation/flight-category"
import { dateFnsLocale } from "@/lib/i18n"

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
  const { t } = useTranslation("reservations")
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
    prefill?.flightCategory && isFlightCategory(prefill.flightCategory) ? prefill.flightCategory : "",
  )
  const [errors, setErrors] = useState<{ aircraft?: string; date?: string; time?: string; category?: string }>({})

  const handleSubmit = async () => {
    const nextErrors: typeof errors = {}
    if (!aircraftId) nextErrors.aircraft = t("form.errors.aircraft")
    if (isClosedDay(selectedDate)) nextErrors.date = t("form.errors.closedDay")
    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
      nextErrors.time = t("form.errors.timeMissing")
    } else if (endTime <= startTime) {
      nextErrors.time = t("form.errors.timeOrder")
    } else if (withTime(selectedDate, startTime) < new Date()) {
      // The API refuses it too; saying so here spares a round trip.
      nextErrors.time = t("form.errors.past")
    }
    if (!flightCategory) nextErrors.category = t("form.errors.category")

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
      title={t("shared.newReservation")}
      description={t("form.newDescription")}
      onSubmit={handleSubmit}
      submitLabel={t("form.submitCreate")}
      submitting={isSubmitting}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-reservation-aircraft">
            {t("common:labels.aircraft")} <RequiredMark />
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
              <SelectValue placeholder={t("form.aircraftPlaceholder")} />
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
              {t("common:labels.date")} <RequiredMark />
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
                  <span className="truncate">{format(selectedDate, "EEE d MMM yyyy", { locale: dateFnsLocale() })}</span>
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
                  locale={dateFnsLocale()}
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
                  {t("common:labels.start")} <RequiredMark />
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
                  {t("common:labels.end")} <RequiredMark />
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
          <Label htmlFor="new-reservation-purpose">{t("form.purpose")}</Label>
          <Input
            id="new-reservation-purpose"
            placeholder={t("form.purposePlaceholder")}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-reservation-category">
            {t("shared.flightCategory")} <RequiredMark />
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
              <SelectValue placeholder={t("form.categoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {flightCategoryOptions().map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.category} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-reservation-notes">{t("common:labels.notes")}</Label>
          <Textarea
            id="new-reservation-notes"
            placeholder={t("form.notesPlaceholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </SidePanel>
  )
}
