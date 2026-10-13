"use client"

import { format } from "date-fns"
import { useTranslation } from "react-i18next"
import { CalendarCheck, ChevronRight, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { EmptyState } from "@/components/layout/EmptyState"
import type { Reservation } from "@/interfaces/reservation"
import { reservationStatus } from "@/lib/reservation-status"
import { formatTime } from "@/lib/format"
import { freeRanges, type TimeRange } from "@/lib/free-ranges"
import { dateFnsLocale } from "@/lib/i18n"
import { reservationPilotName } from "@/components/reservation/reservation-cell"

interface Aircraft {
  id: number
  registration_number: string
  model?: string
  availability_status?: string
}

interface MobileReservationViewProps {
  currentDate: Date
  aircrafts: Aircraft[]
  reservations: Reservation[]
  selectedAircraft: number | null
  setSelectedAircraft: (id: number | null) => void
  currentUserId?: string | number | null
  onViewReservation: (reservation: Reservation) => void
  /** Opening hours of the day, as the desktop grid uses them; null when they are unknown. */
  opening?: Date | null
  closing?: Date | null
  /** A free range was tapped: open the booking form for it. */
  onBookRange?: (aircraftId: number, range: TimeRange) => void
}

const ALL_AIRCRAFT = "all"

/**
 * Day agenda for phones: when each aircraft is free, then the reservations of
 * the day, optionally for one aircraft.
 */
export function MobileReservationView({
  currentDate,
  aircrafts,
  reservations,
  selectedAircraft,
  setSelectedAircraft,
  currentUserId,
  onViewReservation,
  opening = null,
  closing = null,
  onBookRange,
}: MobileReservationViewProps) {
  const { t } = useTranslation("reservations")
  const shownAircrafts = selectedAircraft
    ? aircrafts.filter((aircraft) => String(aircraft.id) === String(selectedAircraft))
    : aircrafts
  // Nothing is offered in the past: today starts now, an earlier day has no free range left.
  const now = new Date()
  const availability =
    opening && closing
      ? shownAircrafts.map((aircraft) => ({
          aircraft,
          ranges: freeRanges(
            opening,
            closing,
            reservations.filter((reservation) => String(reservation.aircraft.id) === String(aircraft.id)),
            { notBefore: now },
          ),
        }))
      : []
  const filteredReservations = selectedAircraft
    ? reservations.filter((r) => String(r.aircraft.id) === String(selectedAircraft))
    : reservations

  const sortedReservations = [...filteredReservations].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  )

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="aircraft-select">{t("common:labels.aircraft")}</Label>
        <Select
          value={selectedAircraft?.toString() ?? ALL_AIRCRAFT}
          onValueChange={(value) => setSelectedAircraft(value === ALL_AIRCRAFT ? null : Number.parseInt(value, 10))}
        >
          <SelectTrigger id="aircraft-select">
            <SelectValue placeholder={t("calendar.mobile.allAircraft")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_AIRCRAFT}>{t("calendar.mobile.allAircraft")}</SelectItem>
            {aircrafts.map((aircraft) => (
              <SelectItem key={aircraft.id} value={aircraft.id.toString()}>
                {aircraft.registration_number}
                {aircraft.model ? ` — ${aircraft.model}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {availability.length > 0 && (
        <section className="space-y-2" aria-labelledby="free-ranges-heading">
          <h2 id="free-ranges-heading" className="text-lg font-semibold">
            {t("calendar.mobile.freeHeading")}
          </h2>
          <ul className="space-y-2">
            {availability.map(({ aircraft, ranges }) => (
              <li
                key={aircraft.id}
                role="group"
                aria-label={t("calendar.mobile.freeFor", { aircraft: aircraft.registration_number })}
                className="rounded-lg border bg-card p-3"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold">{aircraft.registration_number}</span>
                  {aircraft.model && <span className="truncate text-xs text-muted-foreground">{aircraft.model}</span>}
                  {aircraft.availability_status === "UNAVAILABLE" && (
                    <Badge variant="neutral">{t("calendar.aircraftUnavailable")}</Badge>
                  )}
                </div>
                {ranges.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ranges.map((range) => (
                      <button
                        key={range.start.getTime()}
                        type="button"
                        onClick={() => onBookRange?.(aircraft.id, range)}
                        title={t("calendar.mobile.bookRange", {
                          aircraft: aircraft.registration_number,
                          start: formatTime(range.start),
                          end: formatTime(range.end),
                        })}
                        className="inline-flex min-h-9 items-center gap-1 rounded-md border border-success/30 bg-success/15 px-3 text-sm font-medium tabular-nums text-success transition-colors hover:bg-success/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {formatTime(range.start)} – {formatTime(range.end)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{t("calendar.mobile.noFreeRange")}</p>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t("calendar.mobile.freeHint")}</p>
        </section>
      )}

      <h2 className="text-lg font-semibold">
        {t("calendar.mobile.heading", { date: format(currentDate, "EEEE d MMMM yyyy", { locale: dateFnsLocale() }) })}
      </h2>

      {sortedReservations.length > 0 ? (
        <ul className="space-y-2">
          {sortedReservations.map((reservation) => {
            const status = reservationStatus(reservation.status)
            const isMine =
              currentUserId != null && reservation.user?.id != null && String(currentUserId) === String(reservation.user.id)
            const pilot = isMine ? t("common:labels.you") : reservationPilotName(reservation)

            return (
              <li key={reservation.id}>
                <button
                  type="button"
                  onClick={() => onViewReservation(reservation)}
                  className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatTime(reservation.start_time)} – {formatTime(reservation.end_time)}
                      </span>
                      <span className="text-sm font-medium">{reservation.aircraft.registration_number}</span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {[reservation.purpose || t("shared.untitled"), pilot].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState
          icon={CalendarCheck}
          title={selectedAircraft ? t("calendar.mobile.aircraftFree") : t("calendar.mobile.noReservation")}
          description={t("calendar.mobile.emptyDescription")}
        />
      )}
    </div>
  )
}
