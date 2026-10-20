"use client"

import { useMutation, useQuery } from "@apollo/client"
import { useState, useEffect, useMemo, useRef } from "react"
import { format, addHours, eachHourOfInterval, isSameDay } from "date-fns"
import { fr } from "date-fns/locale"
import { useTranslation } from "react-i18next"
import { CalendarOff, Clock, Plane, Plus, Wrench } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/hooks/use-toast"
import {
  CREATE_RESERVATION,
  DELETE_RESERVATION,
  GET_FILTERED_RESERVATIONS,
  UPDATE_RESERVATION,
} from "@/graphql/reservation"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import type { Reservation } from "@/interfaces/reservation"
import { GET_SETTINGS } from "@/graphql/settings"
import { maintenanceClash, maintenanceOn } from "@/lib/weekly-maintenance"
import { toWeekday } from "@/lib/settings"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { DateNavigator } from "@/components/reservation/reservation-header"
import { ReservationCell } from "@/components/reservation/reservation-cell"
import { FreeCell } from "@/components/reservation/free-cell"
import { ReservationForm } from "@/components/reservation/reservation-form"
import { useInstructorRequired } from "@/components/reservation/instructor-field"
import { ReservationDetail } from "@/components/reservation/reservation-detail"
import { MobileReservationView } from "@/components/reservation/mobile-reservation-view"
import {
  NewReservationForm,
  type NewReservationPrefill,
  type NewReservationValues,
} from "@/components/reservation/new-reservation-form"
import { LEGEND_STATUSES, reservationDotClass } from "@/components/reservation/status-style"
import { PriceEstimate } from "@/components/reservation/price-estimate"
import { updateInputFrom } from "@/components/reservation/update-input"
import { reservationStatus } from "@/lib/reservation-status"
import { formatDate, formatTime } from "@/lib/format"
import type { TimeRange } from "@/lib/free-ranges"
import { dateFnsLocale } from "@/lib/i18n"
import { isAdministrator } from "@/lib/roles"
import { apiRefusalMessage } from "@/components/reservation/api-refusal"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"

interface Aircraft {
  id: number
  registration_number: string
  model?: string
  availability_status?: string
  hourly_cost?: number | null
}

interface DragSelection {
  aircraftId: number
  anchor: number
  current: number
}

interface SlotSelection {
  aircraftId: number
  start: Date
  end: Date
}

const normalizeDayName = (day: string) =>
  day
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

const longDate = (date: Date) => format(date, "EEEE d MMMM yyyy", { locale: dateFnsLocale() })

// A reservation template sends its values in the query string ("Utiliser" in "Mes réservations"),
// and so does a course whose aircraft is being booked ("Réserver un avion" on the course).
const readPrefillFromUrl = (): NewReservationPrefill | null => {
  if (typeof window === "undefined") return null
  const params = new URLSearchParams(window.location.search)
  const courseId = Number(params.get("course_id"))
  const prefill: NewReservationPrefill = {
    date: params.get("date") ?? undefined,
    instructorId: params.get("instructor_id") ?? undefined,
    course:
      Number.isInteger(courseId) && courseId > 0
        ? {
            id: courseId,
            instructorName: params.get("instructor") ?? "",
            studentName: params.get("student") ?? "",
          }
        : undefined,
    aircraftId: params.get("aircraft_id") ?? undefined,
    startTime: params.get("start_time") ?? undefined,
    endTime: params.get("end_time") ?? undefined,
    flightCategory: params.get("flight_category") ?? undefined,
    purpose: params.get("purpose") ?? undefined,
    notes: params.get("notes") ?? undefined,
  }
  return Object.values(prefill).some(Boolean) ? prefill : null
}

export default function ReservationCalendar() {
  const { t } = useTranslation("reservations")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [drag, setDrag] = useState<DragSelection | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [slotSelection, setSlotSelection] = useState<SlotSelection | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [prefill, setPrefill] = useState<NewReservationPrefill | undefined>(undefined)
  // The new reservation form reads its initial values when it mounts: a new key gives a fresh form.
  const [newFormKey, setNewFormKey] = useState(0)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false)
  const [purpose, setPurpose] = useState("")
  const [notes, setNotes] = useState("")
  const [flightCategory, setFlightCategory] = useState("")
  const [instructorId, setInstructorId] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [mobileAircraftFilter, setMobileAircraftFilter] = useState<number | null>(null)
  const currentHourRef = useRef<HTMLTableCellElement>(null)
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const userId: string | number | null = userData?.id ?? null
  const isAdmin = isAdministrator(userData)
  // A member without a licence valid until the end of the slot books with an instructor (the API decides).
  const instructorRequired = useInstructorRequired(slotSelection?.end, { skip: !slotSelection })
  const { toast } = useToast()

  const formattedDate = format(currentDate, "yyyy-MM-dd")
  const nextDate = format(new Date(currentDate.getTime() + 86400000), "yyyy-MM-dd")

  const isMobile = useMediaQuery("(max-width: 768px)")

  const [createReservation] = useMutation(CREATE_RESERVATION)
  const [updateReservation] = useMutation(UPDATE_RESERVATION)
  const [deleteReservation] = useMutation(DELETE_RESERVATION)

  const { data: settingsData, loading: loadingSettings } = useQuery(GET_SETTINGS, {
    fetchPolicy: "network-only",
  })

  const { data: aircraftData, loading: loadingAircrafts } = useQuery(GET_AIRCRAFTS)

  const {
    data: reservationData,
    loading: loadingReservations,
    error: errorReservations,
    refetch: refetchReservations,
  } = useQuery(GET_FILTERED_RESERVATIONS, {
    variables: { startDate: formattedDate, endDate: nextDate },
    // Other pilots book too: a day already visited is shown at once, then refreshed.
    fetchPolicy: "cache-and-network",
  })

  const refetchDay = [{ query: GET_FILTERED_RESERVATIONS, variables: { startDate: formattedDate, endDate: nextDate } }]

  const administration = settingsData?.getAllAdministrations?.[0]
  const disabledDays: string[] = useMemo(() => administration?.closureDays ?? [], [administration])

  // One column per bookable hour: the closing time ends the last slot, it does not start one.
  const { slots, closingTime } = useMemo(() => {
    if (!administration) return { slots: [] as Date[], closingTime: null as Date | null }
    const opening = new Date(`${formattedDate}T${administration.reservationStartTime}`)
    const closing = new Date(`${formattedDate}T${administration.reservationEndTime}`)
    if (Number.isNaN(opening.getTime()) || Number.isNaN(closing.getTime()) || closing <= opening) {
      return { slots: [] as Date[], closingTime: null as Date | null }
    }
    return {
      slots: eachHourOfInterval({ start: opening, end: closing }).filter((hour) => hour < closing),
      closingTime: closing,
    }
  }, [administration, formattedDate])

  const slotEnd = (index: number) => {
    const end = addHours(slots[index], 1)
    return closingTime && end > closingTime ? closingTime : end
  }

  // The club's weekly maintenance on the day shown: no aircraft is booked then (the API refuses it).
  const maintenance = useMemo(() => maintenanceOn(administration, currentDate), [administration, currentDate])
  const inMaintenance = (start: Date, end: Date) => maintenance !== null && start < maintenance.end && maintenance.start < end
  const clashWithMaintenance = (start: Date, end: Date) => maintenanceClash(administration, start, end)

  const aircrafts: Aircraft[] = aircraftData?.getAircrafts ?? []
  const dayReservations: Reservation[] = reservationData?.filteredReservations ?? []

  // Closure days come from the API as French or English day names: compared in French whatever the language.
  const isClosedDay = (date: Date) =>
    disabledDays.map(toWeekday).map(normalizeDayName).includes(normalizeDayName(format(date, "EEEE", { locale: fr })))
  const dayClosed = isClosedDay(currentDate)

  const now = new Date()
  const currentSlotIndex = isSameDay(currentDate, now)
    ? slots.findIndex((slot, index) => slot <= now && now < slotEnd(index))
    : -1

  const loading = (loadingReservations && !reservationData) || loadingAircrafts || loadingSettings

  // Open the form pre-filled when the page is reached from a reservation template.
  useEffect(() => {
    const fromUrl = readPrefillFromUrl()
    if (!fromUrl) return
    // A course is booked on its own day.
    const day = fromUrl.date ? new Date(`${fromUrl.date}T00:00:00`) : null
    if (day && !Number.isNaN(day.getTime())) setCurrentDate(day)
    setPrefill(fromUrl)
    setNewFormKey((key) => key + 1)
    setIsNewDialogOpen(true)
    window.history.replaceState(null, "", window.location.pathname)
  }, [])

  // Bring the current hour into view when the grid is wider than the screen.
  useEffect(() => {
    const cell = currentHourRef.current
    const scroller = cell?.closest("div")
    if (!cell || !scroller) return
    scroller.scrollLeft = Math.max(0, cell.offsetLeft - scroller.clientWidth / 2)
  }, [formattedDate, loading, currentSlotIndex])

  const isOwnReservation = (reservation: Reservation) => {
    const ownerId = reservation.user?.id
    return userId != null && ownerId != null && String(userId) === String(ownerId)
  }

  const isInstructorOf = (reservation: Reservation) => {
    const instructorId = reservation.instructor?.id
    return userId != null && instructorId != null && String(userId) === String(instructorId)
  }

  const reservationsOverlapping = (aircraftId: number, start: Date, end: Date) =>
    dayReservations.filter(
      (reservation) =>
        String(reservation.aircraft.id) === String(aircraftId) &&
        new Date(reservation.start_time) < end &&
        new Date(reservation.end_time) > start,
    )

  const resetSlotForm = () => {
    setPurpose("")
    setNotes("")
    setFlightCategory("")
    setInstructorId("")
    setDrag(null)
    setSlotSelection(null)
  }

  const finishSelection = (aircraftId: number, from: number, to: number) => {
    const first = Math.min(from, to)
    const last = Math.max(from, to)
    const start = slots[first]
    const end = slotEnd(last)

    // The API refuses a booking that starts in the past.
    if (start < new Date()) {
      setDrag(null)
      toast({
        variant: "destructive",
        title: t("toast.slotPast.title"),
        description: t("toast.slotPast.description"),
      })
      return
    }

    if (inMaintenance(start, end)) {
      setDrag(null)
      toast({
        variant: "destructive",
        title: t("calendar.maintenance.title"),
        description: t("form.errors.weeklyMaintenance", {
          from: format(maintenance!.start, "HH:mm"),
          to: format(maintenance!.end, "HH:mm"),
        }),
      })
      return
    }

    if (reservationsOverlapping(aircraftId, start, end).length > 0) {
      setDrag(null)
      toast({
        variant: "destructive",
        title: t("toast.slotUnavailable.title"),
        description: t("toast.slotUnavailable.description"),
      })
      return
    }

    setSlotSelection({ aircraftId, start, end })
    setIsCreateDialogOpen(true)
  }

  const handleMouseDown = (aircraftId: number, index: number) => {
    setDrag({ aircraftId, anchor: index, current: index })
    setIsDragging(true)
  }

  const handleMouseEnter = (aircraftId: number, index: number) => {
    if (isDragging && drag?.aircraftId === aircraftId) {
      setDrag({ ...drag, current: index })
    }
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    if (drag) finishSelection(drag.aircraftId, drag.anchor, drag.current)
  }

  const handleKeyboardSelect = (aircraftId: number, index: number) => {
    setDrag({ aircraftId, anchor: index, current: index })
    finishSelection(aircraftId, index, index)
  }

  // A free range tapped on a phone opens the full form on that aircraft, for the first
  // hour of the range: booking the whole free day by mistake would be too easy.
  const handleBookRange = (aircraftId: number, range: TimeRange) => {
    const oneHourLater = new Date(range.start.getTime() + 60 * 60 * 1000)
    const end = oneHourLater < range.end ? oneHourLater : range.end
    setPrefill({
      aircraftId: String(aircraftId),
      startTime: format(range.start, "HH:mm"),
      endTime: format(end, "HH:mm"),
    })
    setNewFormKey((key) => key + 1)
    setIsNewDialogOpen(true)
  }

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setIsReservationDialogOpen(true)
  }

  const handleUpdate = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setIsReservationDialogOpen(false)
    setIsEditDialogOpen(true)
  }

  // Returns true when the reservation was created.
  const createFrom = async (values: NewReservationValues): Promise<boolean> => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: t("toast.accountNotLoaded.title"),
        description: t("toast.accountNotLoaded.description"),
      })
      return false
    }

    if (!values.flightCategory && !values.instructorId && !values.courseId) {
      toast({
        variant: "destructive",
        title: t("toast.categoryMissing.title"),
        description: t("toast.categoryMissing.description"),
      })
      return false
    }

    setIsCreating(true)
    try {
      const estimatedFlightHours = (values.endTime.getTime() - values.startTime.getTime()) / (1000 * 60 * 60)

      await createReservation({
        variables: {
          input: {
            aircraft_id: values.aircraftId,
            start_time: values.startTime,
            end_time: values.endTime,
            purpose: values.purpose,
            user_id: userId,
            estimated_flight_hours: estimatedFlightHours,
            notes: values.notes,
            flight_category: values.flightCategory,
            // Sent only when there is one: the pilot's licence is then not required.
            ...(values.instructorId ? { instructor_id: Number(values.instructorId) } : {}),
            ...(values.courseId ? { course_id: values.courseId } : {}),
          },
        },
        refetchQueries: refetchDay,
      })

      const registration = aircrafts.find((a) => String(a.id) === String(values.aircraftId))?.registration_number
      toast({
        title: t("toast.created.title"),
        description: t("toast.created.description", {
          aircraft: registration ?? t("common:labels.aircraft"),
          date: formatDate(values.startTime),
          start: formatTime(values.startTime),
          end: formatTime(values.endTime),
        }),
      })
      return true
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("toast.refused.title"),
        description: apiRefusalMessage(error, t("toast.refused.description")),
      })
      return false
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateFromSlot = async () => {
    if (!slotSelection) return
    const created = await createFrom({
      aircraftId: slotSelection.aircraftId,
      startTime: slotSelection.start,
      endTime: slotSelection.end,
      purpose,
      notes,
      flightCategory,
      instructorId,
    })
    if (created) {
      setIsCreateDialogOpen(false)
      resetSlotForm()
    }
  }

  const handleCreateFromForm = async (values: NewReservationValues) => {
    const created = await createFrom(values)
    if (created) {
      setIsNewDialogOpen(false)
      setPrefill(undefined)
      // Show the day that was just booked.
      if (!isSameDay(values.startTime, currentDate)) setCurrentDate(values.startTime)
    }
  }

  const handleUpdateReservation = async (values: NewReservationValues) => {
    if (!selectedReservation) return

    setIsUpdating(true)
    try {
      await updateReservation({
        variables: { input: updateInputFrom(selectedReservation, values) },
        refetchQueries: refetchDay,
      })

      setIsEditDialogOpen(false)
      // Show the day the booking now stands on.
      if (!isSameDay(values.startTime, currentDate)) setCurrentDate(values.startTime)
      toast({
        title: t("toast.updated.title"),
        description: t("toast.updated.description", { aircraft: selectedReservation.aircraft.registration_number }),
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("toast.updateFailed.title"),
        description: apiRefusalMessage(error, t("toast.updateFailed.description")),
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteReservation = async () => {
    if (!selectedReservation) return

    try {
      await deleteReservation({
        variables: {
          id: selectedReservation.id,
        },
        refetchQueries: refetchDay,
      })

      setIsReservationDialogOpen(false)
      toast({
        title: t("toast.cancelled.title"),
        description: t("toast.cancelled.description", { aircraft: selectedReservation.aircraft.registration_number }),
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("toast.cancelFailed.title"),
        description: apiRefusalMessage(error, t("toast.cancelFailed.description")),
      })
    }
  }

  const renderRow = (aircraft: Aircraft) => {
    const cells: React.ReactNode[] = []
    let index = 0
    // The API refuses any booking of an unavailable aircraft: its free hours are not offered.
    const unavailable = aircraft.availability_status === "UNAVAILABLE"

    while (index < slots.length) {
      const slotIndex = index
      const slot = slots[slotIndex]
      const reservation = reservationsOverlapping(aircraft.id, slot, slotEnd(slotIndex))[0]

      if (reservation) {
        // The block covers every following slot the reservation still runs into.
        let span = 1
        while (slotIndex + span < slots.length && new Date(reservation.end_time) > slots[slotIndex + span]) {
          span++
        }
        cells.push(
          <ReservationCell
            key={slotIndex}
            reservation={reservation}
            colSpan={span}
            isMine={isOwnReservation(reservation)}
            onClick={() => handleReservationClick(reservation)}
          />,
        )
        index += span
        continue
      }

      // The weekly maintenance is shown like closed hours, on every aircraft.
      if (inMaintenance(slot, slotEnd(slotIndex))) {
        let span = 1
        while (
          slotIndex + span < slots.length &&
          inMaintenance(slots[slotIndex + span], slotEnd(slotIndex + span)) &&
          reservationsOverlapping(aircraft.id, slots[slotIndex + span], slotEnd(slotIndex + span)).length === 0
        ) {
          span++
        }
        cells.push(
          <TableCell
            key={slotIndex}
            colSpan={span}
            className="h-12 border-l border-border/50 bg-muted/40 px-3 text-xs text-muted-foreground"
          >
            {t("calendar.maintenance.cell")}
          </TableCell>,
        )
        index += span
        continue
      }

      if (unavailable) {
        let span = 1
        while (
          slotIndex + span < slots.length &&
          reservationsOverlapping(aircraft.id, slots[slotIndex + span], slotEnd(slotIndex + span)).length === 0
        ) {
          span++
        }
        cells.push(
          <TableCell
            key={slotIndex}
            colSpan={span}
            className="h-12 border-l border-border/50 bg-muted/40 px-3 text-xs text-muted-foreground"
          >
            {t("calendar.unavailableHint")}
          </TableCell>,
        )
        index += span
        continue
      }

      const isSelected =
        drag !== null &&
        drag.aircraftId === aircraft.id &&
        slotIndex >= Math.min(drag.anchor, drag.current) &&
        slotIndex <= Math.max(drag.anchor, drag.current)

      cells.push(
        <FreeCell
          key={slotIndex}
          label={t("calendar.freeSlot", { aircraft: aircraft.registration_number, time: format(slot, "HH:mm") })}
          isSelected={isSelected}
          isCurrentHour={slotIndex === currentSlotIndex}
          onMouseDown={() => handleMouseDown(aircraft.id, slotIndex)}
          onMouseEnter={() => handleMouseEnter(aircraft.id, slotIndex)}
          onActivate={() => handleKeyboardSelect(aircraft.id, slotIndex)}
        />,
      )
      index++
    }

    return (
      <TableRow key={aircraft.id} className="hover:bg-transparent">
        <TableCell className="sticky left-0 z-10 whitespace-nowrap border-r bg-background py-2">
          <span className="font-medium">{aircraft.registration_number}</span>
          {aircraft.model && <span className="block text-xs text-muted-foreground">{aircraft.model}</span>}
          {aircraft.availability_status === "UNAVAILABLE" && (
            <Badge variant="neutral" className="mt-1">
              {t("calendar.aircraftUnavailable")}
            </Badge>
          )}
        </TableCell>
        {cells}
      </TableRow>
    )
  }

  const renderDay = () => {
    if (loading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )
    }

    if (errorReservations) {
      return (
        <ErrorState
          description={t("calendar.loadError")}
          onRetry={() => refetchReservations()}
        />
      )
    }

    if (dayClosed) {
      return (
        <Alert className="border-warning/30 bg-warning/10 text-warning [&>svg]:text-warning">
          <CalendarOff className="h-4 w-4" />
          <AlertTitle>{t("calendar.closed.title")}</AlertTitle>
          <AlertDescription>
            {t("calendar.closed.description", { day: format(currentDate, "EEEE", { locale: dateFnsLocale() }) })}
          </AlertDescription>
        </Alert>
      )
    }

    if (aircrafts.length === 0) {
      return (
        <EmptyState
          icon={Plane}
          title={t("calendar.noAircraft.title")}
          description={t("calendar.noAircraft.description")}
        />
      )
    }

    if (isMobile) {
      return (
        <MobileReservationView
          currentDate={currentDate}
          aircrafts={aircrafts}
          reservations={dayReservations}
          selectedAircraft={mobileAircraftFilter}
          setSelectedAircraft={setMobileAircraftFilter}
          currentUserId={userId}
          onViewReservation={handleReservationClick}
          opening={slots[0] ?? null}
          closing={closingTime}
          maintenance={maintenance}
          onBookRange={handleBookRange}
        />
      )
    }

    if (slots.length === 0) {
      return (
        <EmptyState
          icon={Clock}
          title={t("calendar.noHours.title")}
          description={t("calendar.noHours.description")}
        />
      )
    }

    return (
      <div className="space-y-3">
        <div
          className="overflow-hidden rounded-lg border"
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (isDragging) {
              setIsDragging(false)
              setDrag(null)
            }
          }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-20 min-w-[120px] border-r bg-muted">{t("common:labels.aircraft")}</TableHead>
                {slots.map((slot, index) => (
                  <TableHead
                    key={index}
                    ref={index === currentSlotIndex ? currentHourRef : undefined}
                    aria-current={index === currentSlotIndex ? "time" : undefined}
                    className={cn(
                      "min-w-[44px] px-1 text-center tabular-nums xl:min-w-[60px]",
                      index === currentSlotIndex && "bg-primary/10 font-semibold text-primary",
                    )}
                  >
                    {format(slot, "HH:mm")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>{aircrafts.map(renderRow)}</TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label={t("calendar.legend.label")}>
            {LEGEND_STATUSES.map((status) => (
              <li key={status} className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-sm", reservationDotClass(status))} aria-hidden="true" />
                {reservationStatus(status).label}
              </li>
            ))}
            {currentSlotIndex >= 0 && (
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary/30" aria-hidden="true" />
                {t("calendar.legend.currentHour")}
              </li>
            )}
          </ul>
          <p>{t("calendar.hint")}</p>
        </div>
      </div>
    )
  }

  const selectedAircraftRegistration = slotSelection
    ? (aircrafts.find((a) => a.id === slotSelection.aircraftId)?.registration_number ?? "")
    : ""

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={t("calendar.title")}
        description={t("calendar.description")}
        actions={
          <Button
            onClick={() => {
              setNewFormKey((key) => key + 1)
              setIsNewDialogOpen(true)
            }}
            disabled={aircrafts.length === 0}
          >
            <Plus className="h-4 w-4" />
            {t("shared.newReservation")}
          </Button>
        }
      />

      <DateNavigator currentDate={currentDate} setCurrentDate={setCurrentDate} isClosedDay={isClosedDay} compact={isMobile} />

      {maintenance && !dayClosed && !loading && (
        <Alert>
          <Wrench className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{t("calendar.maintenance.title")}</AlertTitle>
          <AlertDescription>
            {t("calendar.maintenance.description", {
              from: format(maintenance.start, "HH:mm"),
              to: format(maintenance.end, "HH:mm"),
            })}
          </AlertDescription>
        </Alert>
      )}

      {renderDay()}

      {/* Creation from the slots selected in the grid */}
      <ReservationForm
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
          if (!open) resetSlotForm()
        }}
        title={t("form.createTitle")}
        description={t("form.createDescription")}
        summary={
          slotSelection
            ? {
                aircraft: selectedAircraftRegistration,
                date: longDate(slotSelection.start),
                start: format(slotSelection.start, "HH:mm"),
                end: format(slotSelection.end, "HH:mm"),
              }
            : undefined
        }
        price={
          slotSelection ? (
            <PriceEstimate
              hourlyCost={aircrafts.find((a) => a.id === slotSelection.aircraftId)?.hourly_cost}
              start={slotSelection.start}
              end={slotSelection.end}
              withInstructor={instructorId !== ""}
            />
          ) : undefined
        }
        purpose={purpose}
        setPurpose={setPurpose}
        notes={notes}
        setNotes={setNotes}
        flightCategory={flightCategory}
        setFlightCategory={setFlightCategory}
        instructorId={instructorId}
        setInstructorId={setInstructorId}
        instructorRequired={instructorRequired}
        pilotId={userId}
        onSubmit={handleCreateFromSlot}
        isSubmitting={isCreating}
      />

      {/* Creation from the "Nouvelle réservation" button or a template */}
      {aircrafts.length > 0 && (
        <NewReservationForm
          key={newFormKey}
          open={isNewDialogOpen}
          onOpenChange={(open) => {
            setIsNewDialogOpen(open)
            if (!open) setPrefill(undefined)
          }}
          aircrafts={aircrafts}
          currentDate={currentDate}
          prefill={prefill}
          isClosedDay={isClosedDay}
          maintenanceClash={clashWithMaintenance}
          onSubmit={handleCreateFromForm}
          isSubmitting={isCreating}
          pilotId={userId}
        />
      )}

      {selectedReservation && (
        <ReservationDetail
          open={isReservationDialogOpen}
          onOpenChange={setIsReservationDialogOpen}
          reservation={selectedReservation}
          onEdit={() => handleUpdate(selectedReservation)}
          onDelete={handleDeleteReservation}
          // An administrator may change anyone's booking (the API checks it).
          canEdit={isOwnReservation(selectedReservation) || isAdmin}
          isOwner={isOwnReservation(selectedReservation)}
          isAdmin={isAdmin}
          isInstructor={isInstructorOf(selectedReservation)}
        />
      )}

      {selectedReservation && isEditDialogOpen && (
        <NewReservationForm
          key={`edit-${selectedReservation.id}`}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          aircrafts={aircrafts}
          currentDate={currentDate}
          isClosedDay={isClosedDay}
          maintenanceClash={clashWithMaintenance}
          onSubmit={handleUpdateReservation}
          isSubmitting={isUpdating}
          editing={selectedReservation}
          // Another member's licence is the API's to check.
          checkLicence={isOwnReservation(selectedReservation)}
          forSelf={isOwnReservation(selectedReservation)}
          pilotId={selectedReservation.user?.id}
        />
      )}
    </div>
  )
}
