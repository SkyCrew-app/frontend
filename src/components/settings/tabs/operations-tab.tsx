"use client"

import { useFormContext } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TIME_SLOT_OPTIONS, WEEKDAYS, type SettingsFormValues } from "@/lib/settings"
import { SettingsField, SettingsSection, UnitInput, errorMessage } from "../settings-field"

export function OperationsTab() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<SettingsFormValues>()
  const closureDays = watch("closureDays") ?? []
  const timeSlotDuration = watch("timeSlotDuration")
  const maintenanceDay = watch("maintenanceDay")

  const toggleClosureDay = (day: string, checked: boolean) => {
    // Keep the days in week order whatever the order of the clicks.
    const selected = checked ? [...closureDays, day] : closureDays.filter((d) => d !== day)
    const ordered = [
      ...WEEKDAYS.filter((weekday) => selected.includes(weekday)),
      ...selected.filter((d) => !(WEEKDAYS as readonly string[]).includes(d)),
    ]
    setValue("closureDays", ordered, { shouldDirty: true })
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Horaires de réservation"
        description="La plage horaire ouverte aux réservations et la durée d'un créneau."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <SettingsField
            id="reservation-start-time"
            label="Début des réservations"
            required
            error={errorMessage(errors.reservationStartTime)}
          >
            <Input
              id="reservation-start-time"
              type="time"
              aria-invalid={errors.reservationStartTime ? true : undefined}
              {...register("reservationStartTime")}
            />
          </SettingsField>
          <SettingsField
            id="reservation-end-time"
            label="Fin des réservations"
            required
            error={errorMessage(errors.reservationEndTime)}
          >
            <Input
              id="reservation-end-time"
              type="time"
              aria-invalid={errors.reservationEndTime ? true : undefined}
              {...register("reservationEndTime")}
            />
          </SettingsField>
          <SettingsField
            id="timeslot-duration"
            label="Durée d'un créneau"
            required
            error={errorMessage(errors.timeSlotDuration)}
          >
            <Select
              value={timeSlotDuration ? String(timeSlotDuration) : ""}
              onValueChange={(value) =>
                setValue("timeSlotDuration", Number.parseInt(value), { shouldDirty: true, shouldValidate: true })
              }
            >
              <SelectTrigger id="timeslot-duration" aria-invalid={errors.timeSlotDuration ? true : undefined}>
                <SelectValue placeholder="Choisir une durée" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Jours de fermeture"
        description="Cochez les jours de la semaine où le club est fermé."
      >
        <fieldset>
          <legend className="sr-only">Jours de fermeture</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WEEKDAYS.map((day) => (
              <div key={day} className="flex min-h-9 items-center gap-2">
                <Checkbox
                  id={`closure-${day}`}
                  checked={closureDays.includes(day)}
                  onCheckedChange={(checked) => toggleClosureDay(day, checked === true)}
                />
                <Label htmlFor={`closure-${day}`} className="font-normal">
                  {day}
                </Label>
              </div>
            ))}
          </div>
        </fieldset>
      </SettingsSection>

      <SettingsSection
        title="Maintenance hebdomadaire"
        description="Le jour et la durée de l'entretien hebdomadaire des avions."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <SettingsField id="maintenance-day" label="Jour de maintenance" error={errorMessage(errors.maintenanceDay)}>
            <Select
              value={maintenanceDay ?? ""}
              onValueChange={(value) => setValue("maintenanceDay", value, { shouldDirty: true })}
            >
              <SelectTrigger id="maintenance-day">
                <SelectValue placeholder="Choisir un jour" />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((day) => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
          <SettingsField
            id="maintenance-duration"
            label="Durée de la maintenance"
            required
            hint="Nombre entier d'heures, de 1 à 24."
            error={errorMessage(errors.maintenanceDuration)}
          >
            <UnitInput
              id="maintenance-duration"
              unit="h"
              inputMode="numeric"
              min="1"
              max="24"
              step="1"
              placeholder="4"
              aria-invalid={errors.maintenanceDuration ? true : undefined}
              aria-describedby="maintenance-duration-hint"
              {...register("maintenanceDuration", { valueAsNumber: true })}
            />
          </SettingsField>
        </div>
      </SettingsSection>
    </div>
  )
}
