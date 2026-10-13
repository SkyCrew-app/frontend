"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ReservationTemplate } from "@/interfaces/reservation-template"
import { SidePanel } from "@/components/layout/SidePanel"
import { flightCategoryOptions } from "@/components/reservation/flight-category"

interface Aircraft {
  id: number
  registration_number: string
  model: string
}

// Day numbers as the API stores them (0 = Sunday), listed from Monday.
const DAYS = ["1", "2", "3", "4", "5", "6", "0"]

interface TemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: ReservationTemplate | null
  aircraftList: Aircraft[]
  onSave: (data: any) => void
  loading?: boolean
}

export function TemplateDialog({ open, onOpenChange, template, aircraftList, onSave, loading }: TemplateDialogProps) {
  const { t } = useTranslation("reservations")
  const [name, setName] = useState("")
  const [aircraftId, setAircraftId] = useState<string>("none")
  const [dayOfWeek, setDayOfWeek] = useState<string>("none")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [flightCategory, setFlightCategory] = useState("LOCAL")
  const [purpose, setPurpose] = useState("")
  const [notes, setNotes] = useState("")
  const [estimatedHours, setEstimatedHours] = useState("")
  // Errors only show once the step they belong to has been checked.
  const [nameChecked, setNameChecked] = useState(false)
  const [timeChecked, setTimeChecked] = useState(false)

  useEffect(() => {
    setNameChecked(false)
    setTimeChecked(false)
    if (template) {
      setName(template.name)
      setAircraftId(template.aircraft?.id?.toString() ?? "none")
      setDayOfWeek(template.day_of_week?.toString() ?? "none")
      setStartTime(template.preferred_start_time ?? "")
      setEndTime(template.preferred_end_time ?? "")
      setFlightCategory(template.flight_category)
      setPurpose(template.purpose ?? "")
      setNotes(template.notes ?? "")
      setEstimatedHours(template.estimated_flight_hours?.toString() ?? "")
    } else {
      setName("")
      setAircraftId("none")
      setDayOfWeek("none")
      setStartTime("")
      setEndTime("")
      setFlightCategory("LOCAL")
      setPurpose("")
      setNotes("")
      setEstimatedHours("")
    }
  }, [template, open])

  const nameMissing = !name.trim()
  const timeInvalid = !!startTime && !!endTime && endTime <= startTime
  const nameError = nameChecked && nameMissing ? t("template.form.nameRequired") : undefined
  const timeError = timeChecked && timeInvalid ? t("form.errors.timeOrder") : undefined

  const validateIdentity = () => {
    setNameChecked(true)
    return !nameMissing
  }

  const validateSlot = () => {
    setTimeChecked(true)
    return !timeInvalid
  }

  const handleSubmit = () => {
    // Both steps were checked on the way here; this is the last guard before saving.
    if (!validateIdentity() || !validateSlot()) return

    const data: any = {
      name: name.trim(),
      flight_category: flightCategory,
    }
    if (aircraftId !== "none") data.aircraft_id = parseInt(aircraftId)
    if (dayOfWeek !== "none") data.day_of_week = parseInt(dayOfWeek)
    if (startTime) data.preferred_start_time = startTime
    if (endTime) data.preferred_end_time = endTime
    if (purpose) data.purpose = purpose
    if (notes) data.notes = notes
    if (estimatedHours) data.estimated_flight_hours = parseFloat(estimatedHours)
    if (template) data.id = template.id

    onSave(data)
  }

  const identityFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="template-name">
          {t("template.form.name")}{" "}
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        </Label>
        <Input
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("template.form.namePlaceholder")}
          aria-invalid={!!nameError}
          aria-required="true"
        />
        {nameError && <p className="text-sm text-destructive">{nameError}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="template-aircraft">{t("common:labels.aircraft")}</Label>
          <Select value={aircraftId} onValueChange={setAircraftId}>
            <SelectTrigger id="template-aircraft">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("template.form.anyAircraft")}</SelectItem>
              {aircraftList.map((a) => (
                <SelectItem key={a.id} value={a.id.toString()}>
                  {a.registration_number} — {a.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="template-category">{t("shared.flightCategory")}</Label>
          <Select value={flightCategory} onValueChange={setFlightCategory}>
            <SelectTrigger id="template-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {flightCategoryOptions().map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-purpose">{t("template.form.purpose")}</Label>
        <Input
          id="template-purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder={t("template.form.purposePlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-notes">{t("common:labels.notes")}</Label>
        <Textarea
          id="template-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={t("form.notesPlaceholder")}
        />
      </div>
    </div>
  )

  const slotFields = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="template-day">{t("template.form.usualDay")}</Label>
          <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
            <SelectTrigger id="template-day">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("common:labels.none")}</SelectItem>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>
                  {t(`weekday.${day}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="template-hours">{t("template.form.flightHours")}</Label>
          <Input
            id="template-hours"
            type="number"
            step="0.5"
            min="0"
            max="24"
            inputMode="decimal"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
            placeholder={t("template.form.flightHoursPlaceholder")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="template-start">{t("template.form.startTime")}</Label>
            <Input id="template-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-end">{t("template.form.endTime")}</Label>
            <Input
              id="template-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              aria-invalid={!!timeError}
            />
          </div>
        </div>
        {timeError && <p className="text-sm text-destructive">{timeError}</p>}
      </div>
    </div>
  )

  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => {
        if (!next && loading) return
        onOpenChange(next)
      }}
      title={template ? t("template.form.editTitle") : t("template.new")}
      description={t("template.intro")}
      onSubmit={handleSubmit}
      submitLabel={template ? t("common:actions.save") : t("template.form.submitCreate")}
      submitting={loading}
      steps={[
        { title: t("template.form.stepFlight"), content: identityFields, validate: validateIdentity },
        {
          title: t("template.form.stepSlot"),
          description: t("template.form.stepSlotDescription"),
          content: slotFields,
          validate: validateSlot,
        },
      ]}
    />
  )
}
