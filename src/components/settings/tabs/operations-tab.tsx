"use client"

import { useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WEEKDAYS, weekdayLabel, type SettingsFormValues } from "@/lib/settings"
import { SettingsField, SettingsSection, UnitInput, errorMessage } from "../settings-field"

export function OperationsTab() {
  const { t } = useTranslation("administration")
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<SettingsFormValues>()
  const closureDays = watch("closureDays") ?? []
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
        title={t("settings.bookings.hours.title")}
        description={t("settings.bookings.hours.description")}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <SettingsField
            id="reservation-start-time"
            label={t("settings.bookings.hours.start")}
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
            label={t("settings.bookings.hours.end")}
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
        </div>
      </SettingsSection>

      <SettingsSection
        title={t("settings.bookings.closure.title")}
        description={t("settings.bookings.closure.description")}
      >
        <fieldset>
          <legend className="sr-only">{t("settings.bookings.closure.title")}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WEEKDAYS.map((day) => (
              <div key={day} className="flex min-h-9 items-center gap-2">
                <Checkbox
                  id={`closure-${day}`}
                  checked={closureDays.includes(day)}
                  onCheckedChange={(checked) => toggleClosureDay(day, checked === true)}
                />
                <Label htmlFor={`closure-${day}`} className="font-normal">
                  {weekdayLabel(day)}
                </Label>
              </div>
            ))}
          </div>
        </fieldset>
      </SettingsSection>

      <SettingsSection
        title={t("settings.bookings.maintenance.title")}
        description={t("settings.bookings.maintenance.description")}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <SettingsField
            id="maintenance-day"
            label={t("settings.bookings.maintenance.day")}
            error={errorMessage(errors.maintenanceDay)}
          >
            <Select
              value={maintenanceDay ?? ""}
              onValueChange={(value) => setValue("maintenanceDay", value, { shouldDirty: true })}
            >
              <SelectTrigger id="maintenance-day">
                <SelectValue placeholder={t("settings.bookings.maintenance.dayPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((day) => (
                  <SelectItem key={day} value={day}>
                    {weekdayLabel(day)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
          <SettingsField
            id="maintenance-duration"
            label={t("settings.bookings.maintenance.duration")}
            required
            hint={t("settings.bookings.maintenance.durationHint")}
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
