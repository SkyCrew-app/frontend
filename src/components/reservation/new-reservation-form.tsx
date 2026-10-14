"use client"

import { useState, type ReactNode } from "react"
import { format, addHours, startOfHour } from "date-fns"
import { useTranslation } from "react-i18next"
import { useQuery } from "@apollo/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, TriangleAlert } from "lucide-react"
import { SidePanel } from "@/components/layout/SidePanel"
import { flightCategoryOptions, isFlightCategory } from "@/components/reservation/flight-category"
import { InstructorField, useInstructorRequired } from "@/components/reservation/instructor-field"
import { PriceEstimate } from "@/components/reservation/price-estimate"
import type { Reservation } from "@/interfaces/reservation"
import { INSTRUCTION_CATEGORY } from "@/components/reservation/reservation-form"
import { dateFnsLocale } from "@/lib/i18n"
import { GET_RESERVATION_COURSE } from "@/graphql/reservation"
import { formatDate, formatTime } from "@/lib/format"

interface Aircraft {
  id: number
  registration_number: string
  model?: string
  /** "UNAVAILABLE": the API refuses any booking of it. */
  availability_status?: string | null
  hourly_cost?: number | null
}

export interface NewReservationValues {
  aircraftId: number
  startTime: Date
  endTime: Date
  purpose: string
  notes: string
  flightCategory: string
  /** Id of the instructor on board, "" for a flight without one. */
  instructorId?: string
  /** The course this booking is made for: the API takes its student and its instructor. */
  courseId?: number
}

/** The course a booking is made for, as sent by the course screen. */
export interface CoursePrefill {
  id: number
  instructorName: string
  studentName: string
}

/** Values a reservation template (or anything else) can pre-fill. */
export interface NewReservationPrefill {
  /** Day of the booking, "2026-10-16". */
  date?: string
  instructorId?: string
  course?: CoursePrefill
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
  /** The club's weekly maintenance a slot runs into, which the API refuses (null when none). */
  maintenanceClash?: (start: Date, end: Date) => { start: Date; end: Date } | null
  onSubmit: (values: NewReservationValues) => Promise<void>
  isSubmitting: boolean
  /**
   * Whether the form checks the signed-in member's licence (valid until the end of the
   * slot) to require an instructor. Off when an administrator changes someone else's booking.
   */
  checkLicence?: boolean
  /** The pilot of the booking, who cannot be their own instructor. */
  pilotId?: number | string | null
  /** The booking being changed: the form then edits it instead of creating one. */
  editing?: Reservation
  /** Optional action at the start of the footer (cancelling the booking being edited). */
  footerStart?: ReactNode
  /** The booking is the signed-in member's (wording of the price line). */
  forSelf?: boolean
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

// The values of an existing booking, in the shape of a pre-fill.
const prefillFrom = (reservation: Reservation): NewReservationPrefill => {
  const start = new Date(reservation.start_time)
  return {
    date: format(start, "yyyy-MM-dd"),
    aircraftId: String(reservation.aircraft.id),
    startTime: format(start, "HH:mm"),
    endTime: format(new Date(reservation.end_time), "HH:mm"),
    flightCategory: reservation.flight_category ?? undefined,
    purpose: reservation.purpose ?? undefined,
    notes: reservation.notes ?? undefined,
    instructorId: reservation.instructor?.id != null ? String(reservation.instructor.id) : undefined,
  }
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
  prefill: given,
  isClosedDay,
  maintenanceClash,
  onSubmit,
  isSubmitting,
  checkLicence = true,
  pilotId,
  editing,
  footerStart,
  forSelf = true,
}: NewReservationFormProps) {
  const { t } = useTranslation("reservations")
  const nextHour = addHours(startOfHour(new Date()), 1)
  // A booking being changed starts from its own values.
  const prefill = editing ? prefillFrom(editing) : given
  const course = prefill?.course
  const [instructorId, setInstructorId] = useState(prefill?.instructorId ?? "")
  // A booking made for a course is flown with the instructor of the course.
  const withInstructor = !!course || instructorId !== ""
  // The course a booking being changed is the aircraft of: a new instructor detaches it (the API
  // leaves the course without an aircraft), so the panel says so before saving.
  const { data: courseData } = useQuery<{
    reservation: { id: number; course: { id: number; startTime: string; endTime?: string | null } | null } | null
  }>(GET_RESERVATION_COURSE, { variables: { id: Number(editing?.id) }, skip: !editing || !open })
  const linkedCourse = courseData?.reservation?.course ?? null
  const leavesCourse =
    !!linkedCourse && instructorId !== (editing?.instructor?.id != null ? String(editing.instructor.id) : "")

  // An aircraft the API refuses to book is not offered, except the one the booking already has.
  const isBookable = (aircraft: Aircraft) =>
    aircraft.availability_status !== "UNAVAILABLE" || (!!editing && String(aircraft.id) === String(editing.aircraft.id))
  const [aircraftId, setAircraftId] = useState(
    prefill?.aircraftId && aircrafts.some((a) => String(a.id) === prefill.aircraftId && isBookable(a))
      ? prefill.aircraftId
      : "",
  )
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const prefilled = prefill?.date ? new Date(`${prefill.date}T00:00:00`) : null
    return prefilled && !Number.isNaN(prefilled.getTime()) ? prefilled : currentDate
  })
  const [dateOpen, setDateOpen] = useState(false)
  const [startTime, setStartTime] = useState(toTimeValue(prefill?.startTime, nextHour))
  const [endTime, setEndTime] = useState(toTimeValue(prefill?.endTime, addHours(nextHour, 1)))
  const [purpose, setPurpose] = useState(prefill?.purpose ?? "")
  const [notes, setNotes] = useState(prefill?.notes ?? "")
  const [flightCategory, setFlightCategory] = useState(
    prefill?.flightCategory && isFlightCategory(prefill.flightCategory) ? prefill.flightCategory : "",
  )
  const slotStart = TIME_PATTERN.test(startTime) ? withTime(selectedDate, startTime) : null
  const slotEnd = TIME_PATTERN.test(endTime) ? withTime(selectedDate, endTime) : null
  // The licence must be valid until the end of the flight, as the API checks it.
  const instructorRequired = useInstructorRequired(slotEnd, { skip: !checkLicence || !open })
  const aircraft = aircrafts.find((a) => String(a.id) === aircraftId)
  const slotChanged =
    !!editing &&
    (aircraftId !== String(editing.aircraft.id) ||
      slotStart?.getTime() !== new Date(editing.start_time).getTime() ||
      slotEnd?.getTime() !== new Date(editing.end_time).getTime())
  const [errors, setErrors] = useState<{
    aircraft?: string
    date?: string
    time?: string
    category?: string
    instructor?: string
  }>({})

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
    // A new or moved booking stays out of the weekly maintenance (the API checks it).
    const clash =
      !nextErrors.time && slotStart && slotEnd && (!editing || slotChanged)
        ? maintenanceClash?.(slotStart, slotEnd)
        : null
    if (clash) {
      nextErrors.time = t("form.errors.weeklyMaintenance", {
        from: format(clash.start, "HH:mm"),
        to: format(clash.end, "HH:mm"),
      })
    }
    const missingInstructor = !course && instructorRequired && !instructorId
    // Choosing the required instructor sets the category: one error is enough.
    if (!flightCategory && !withInstructor && !missingInstructor) nextErrors.category = t("form.errors.category")
    if (missingInstructor) nextErrors.instructor = t("form.errors.instructor")

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    await onSubmit({
      aircraftId: Number.parseInt(aircraftId, 10),
      startTime: withTime(selectedDate, startTime),
      endTime: withTime(selectedDate, endTime),
      purpose,
      notes,
      flightCategory: withInstructor ? INSTRUCTION_CATEGORY : flightCategory,
      instructorId: course ? undefined : instructorId,
      courseId: course?.id,
    })
  }

  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => {
        if (!next && isSubmitting) return
        onOpenChange(next)
      }}
      title={editing ? t("form.editTitle") : t("shared.newReservation")}
      description={editing ? t("form.editDescription") : t("form.newDescription")}
      onSubmit={handleSubmit}
      submitLabel={editing ? t("common:actions.save") : t("form.submitCreate")}
      submitting={isSubmitting}
      footerStart={footerStart}
    >
      <div className="space-y-4">
        {course && (
          <p className="rounded-lg bg-muted/50 p-3 text-sm" role="note">
            {t("form.course.note", { student: course.studentName, instructor: course.instructorName })}
          </p>
        )}

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
                <SelectItem key={aircraft.id} value={aircraft.id.toString()} disabled={!isBookable(aircraft)}>
                  {aircraft.registration_number}
                  {aircraft.model ? ` — ${aircraft.model}` : ""}
                  {!isBookable(aircraft) ? ` (${t("calendar.aircraftUnavailable").toLowerCase()})` : ""}
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

        {aircraft && (
          <PriceEstimate
            hourlyCost={aircraft.hourly_cost}
            start={slotStart}
            end={slotEnd}
            withInstructor={withInstructor}
            chargedAmount={editing ? (editing.charged_amount ?? null) : undefined}
            slotChanged={slotChanged}
            forSelf={forSelf}
          />
        )}

        <div className="space-y-2">
          <Label htmlFor="new-reservation-purpose">{t("form.purpose")}</Label>
          <Input
            id="new-reservation-purpose"
            placeholder={t("form.purposePlaceholder")}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </div>

        {!course && (
          <InstructorField
            id="new-reservation-instructor"
            value={instructorId}
            onChange={(value) => {
              setInstructorId(value)
              setErrors((prev) => ({ ...prev, instructor: undefined, category: value ? undefined : prev.category }))
            }}
            required={instructorRequired}
            error={errors.instructor}
            excludeId={pilotId}
          />
        )}
        {leavesCourse && linkedCourse && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm"
          >
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              {t("form.course.leaves", {
                date: formatDate(linkedCourse.startTime),
                time: formatTime(linkedCourse.startTime),
              })}
            </span>
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="new-reservation-category">
            {t("shared.flightCategory")} <RequiredMark />
          </Label>
          <Select
            value={(withInstructor ? INSTRUCTION_CATEGORY : flightCategory) || undefined}
            onValueChange={(value) => {
              setFlightCategory(value)
              setErrors((prev) => ({ ...prev, category: undefined }))
            }}
            disabled={withInstructor}
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
