"use client"

import { useState } from "react"
import { useMutation } from "@apollo/client"
import { format, parseISO } from "date-fns"
import { useTranslation } from "react-i18next"
import { Loader2, Pencil, ShieldAlert, Trash2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SidePanel } from "@/components/layout/SidePanel"
import { useToast } from "@/components/hooks/use-toast"
import { REMOVE_FLIGHT, UPDATE_FLIGHT } from "@/graphql/flights"
import { apiRefusal } from "@/lib/api-refusal"
import { datetimeLocalToISOString } from "@/lib/datetime"
import { formatDateTime, formatFlightDuration } from "@/lib/format"

export interface ClosedFlight {
  id: number | string
  origin_icao: string
  destination_icao: string
  closed_at?: string | null
  flight_hours?: number | null
  number_of_passengers?: number | null
  departure_time?: string | null
  arrival_time?: string | null
  remarks?: string | null
  user?: { first_name?: string | null; last_name?: string | null } | null
}

interface ClosedFlightAdminProps {
  flight: ClosedFlight
  onChanged: () => void
  onDeleted: () => void
}

const toInput = (iso: string | null | undefined) => (iso ? format(parseISO(iso), "yyyy-MM-dd'T'HH:mm") : "")

// A flight time as typed by a person: "1:30", "1 h 30", "1,5" or "1.5" hours.
export const parseFlightTime = (text: string): number | null => {
  const clock = /^\s*(\d+)\s*(?::|h)\s*(\d{1,2})?\s*(?:min)?\s*$/i.exec(text)
  if (clock) {
    const minutes = Number(clock[2] ?? 0)
    return minutes < 60 ? Number(clock[1]) + minutes / 60 : null
  }
  const decimal = Number(text.trim().replace(",", "."))
  return text.trim() !== "" && Number.isFinite(decimal) ? decimal : null
}

// "1:30" for 1.5 hours: exact to the minute, which is how flights are closed.
const toClock = (hours: number) => {
  const minutes = Math.round(hours * 60)
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`
}

/**
 * A closed flight is in the pilot's logbook: only an administrator corrects or deletes it.
 * The API keeps a trace of every change and moves the counted hours accordingly.
 */
export function ClosedFlightAdmin({ flight, onChanged, onDeleted }: ClosedFlightAdminProps) {
  const { t } = useTranslation("flights")
  const { toast } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ departure: "", arrival: "", hours: "", passengers: "", remarks: "" })
  const [updateFlight, { loading: saving }] = useMutation(UPDATE_FLIGHT)
  const [removeFlight, { loading: removing }] = useMutation(REMOVE_FLIGHT)

  const route = `${flight.origin_icao} → ${flight.destination_icao}`
  const pilot = [flight.user?.first_name, flight.user?.last_name].filter(Boolean).join(" ") || "—"

  const openEdit = () => {
    setForm({
      departure: toInput(flight.departure_time),
      arrival: toInput(flight.arrival_time),
      hours: flight.flight_hours != null ? toClock(flight.flight_hours) : "",
      passengers: flight.number_of_passengers != null ? String(flight.number_of_passengers) : "",
      remarks: flight.remarks ?? "",
    })
    setSubmitted(false)
    setEditOpen(true)
  }

  const hours = parseFlightTime(form.hours) ?? Number.NaN
  // Unchanged, the recorded value is sent back as it is (not rounded to the minute).
  const hoursChanged = flight.flight_hours == null || form.hours !== toClock(flight.flight_hours)
  const passengers = form.passengers === "" ? null : Number.parseInt(form.passengers, 10)
  const errors = {
    hours: Number.isFinite(hours) && hours > 0 ? null : t("closedAdmin.errors.hours"),
    passengers: passengers === null || (Number.isInteger(passengers) && passengers >= 0) ? null : t("closedAdmin.errors.passengers"),
    arrival:
      form.departure && form.arrival && new Date(form.arrival) <= new Date(form.departure)
        ? t("closedAdmin.errors.arrival")
        : null,
  }
  const fieldError = (name: keyof typeof errors) =>
    submitted && errors[name] ? <p className="text-sm text-destructive">{errors[name]}</p> : null

  const save = async () => {
    setSubmitted(true)
    if (Object.values(errors).some(Boolean)) return
    try {
      await updateFlight({
        variables: {
          updateFlightInput: {
            id: Number(flight.id),
            ...(hoursChanged ? { flight_hours: hours } : {}),
            ...(passengers !== null ? { number_of_passengers: passengers } : {}),
            ...(form.departure ? { departure_time: datetimeLocalToISOString(form.departure) } : {}),
            ...(form.arrival ? { arrival_time: datetimeLocalToISOString(form.arrival) } : {}),
            remarks: form.remarks,
          },
        },
      })
      setEditOpen(false)
      toast({ title: t("closedAdmin.toast.updated.title"), description: t("closedAdmin.toast.updated.description") })
      onChanged()
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("closedAdmin.toast.updateFailed"),
        description: apiRefusal(error, t("closedAdmin.toast.retry")),
      })
    }
  }

  const remove = async () => {
    try {
      await removeFlight({ variables: { id: Number(flight.id) } })
      setConfirmOpen(false)
      toast({ title: t("closedAdmin.toast.deleted.title"), description: t("closedAdmin.toast.deleted.description", { route }) })
      onDeleted()
    } catch (error) {
      setConfirmOpen(false)
      toast({
        variant: "destructive",
        title: t("closedAdmin.toast.deleteFailed"),
        description: apiRefusal(error, t("closedAdmin.toast.retry")),
      })
    }
  }

  return (
    <>
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>{t("closedAdmin.title")}</AlertTitle>
        <AlertDescription>
          <p>
            {t("closedAdmin.description", {
              date: flight.closed_at ? formatDateTime(flight.closed_at) : "—",
              pilot,
              duration: formatFlightDuration(flight.flight_hours ?? 0),
            })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="h-4 w-4" />
              {t("closedAdmin.edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              {t("closedAdmin.delete")}
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <SidePanel
        open={editOpen}
        onOpenChange={(next) => !next && !saving && setEditOpen(false)}
        title={t("closedAdmin.form.title")}
        description={t("closedAdmin.form.description", { route, pilot })}
        size="md"
        onSubmit={save}
        submitLabel={t("common:actions.save")}
        submitting={saving}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="closed-flight-departure">{t("closedAdmin.form.departure")}</Label>
              <Input
                id="closed-flight-departure"
                type="datetime-local"
                value={form.departure}
                onChange={(event) => setForm({ ...form, departure: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closed-flight-arrival">{t("closedAdmin.form.arrival")}</Label>
              <Input
                id="closed-flight-arrival"
                type="datetime-local"
                value={form.arrival}
                min={form.departure || undefined}
                onChange={(event) => setForm({ ...form, arrival: event.target.value })}
                aria-invalid={submitted && !!errors.arrival}
              />
              {fieldError("arrival")}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="closed-flight-hours">
                {t("closedAdmin.form.hours")} <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id="closed-flight-hours"
                inputMode="decimal"
                placeholder="1:30"
                value={form.hours}
                onChange={(event) => setForm({ ...form, hours: event.target.value })}
                aria-invalid={submitted && !!errors.hours}
                aria-describedby="closed-flight-hours-hint"
              />
              <p id="closed-flight-hours-hint" className="text-xs text-muted-foreground">
                {t("closedAdmin.form.hoursHint")}
              </p>
              {fieldError("hours")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="closed-flight-passengers">{t("closedAdmin.form.passengers")}</Label>
              <Input
                id="closed-flight-passengers"
                type="number"
                min={0}
                step={1}
                value={form.passengers}
                onChange={(event) => setForm({ ...form, passengers: event.target.value })}
                aria-invalid={submitted && !!errors.passengers}
              />
              {fieldError("passengers")}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="closed-flight-remarks">{t("closedAdmin.form.remarks")}</Label>
            <Textarea
              id="closed-flight-remarks"
              rows={3}
              value={form.remarks}
              onChange={(event) => setForm({ ...form, remarks: event.target.value })}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("closedAdmin.form.trace")}</p>
        </div>
      </SidePanel>

      <AlertDialog open={confirmOpen} onOpenChange={(next) => !removing && setConfirmOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("closedAdmin.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("closedAdmin.deleteConfirm.description", {
                route,
                pilot,
                duration: formatFlightDuration(flight.flight_hours ?? 0),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>{t("common:actions.cancel")}</AlertDialogCancel>
            <Button variant="destructive" onClick={() => void remove()} disabled={removing}>
              {removing && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("closedAdmin.deleteConfirm.action")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
