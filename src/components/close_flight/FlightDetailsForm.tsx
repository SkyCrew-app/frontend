"use client"

import { useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FLIGHT_RULE_OPTIONS, flightTypeLabel } from "@/components/flight/flight-type"

const RequiredMark = () => (
  <span className="text-destructive" aria-hidden="true">
    {" "}
    *
  </span>
)

// An empty number field counts as zero rather than as an invalid number.
const toNumber = (raw: string, parse: (value: string) => number) => {
  const value = parse(raw)
  return Number.isNaN(value) ? 0 : value
}

/** Flight time typed the way pilots log it (hours and minutes), stored as decimal hours. */
function DurationInput({ value, onChange }: { value: number; onChange: (hours: number) => void }) {
  const { t } = useTranslation("flights")
  const totalMinutes = Math.round((Number.isFinite(value) ? value : 0) * 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  const update = (nextHours: number, nextMinutes: number) => {
    const safeHours = Math.max(0, Number.isNaN(nextHours) ? 0 : nextHours)
    const safeMinutes = Math.min(59, Math.max(0, Number.isNaN(nextMinutes) ? 0 : nextMinutes))
    onChange((safeHours * 60 + safeMinutes) / 60)
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={24}
        step={1}
        aria-label={t("closeFlight.details.hoursAria")}
        className="w-20 tabular-nums"
        value={hours}
        onChange={(e) => update(Number.parseInt(e.target.value, 10), minutes)}
      />
      <span className="text-sm text-muted-foreground">h</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={59}
        step={1}
        aria-label={t("closeFlight.details.minutesAria")}
        className="w-20 tabular-nums"
        value={minutes}
        onChange={(e) => update(hours, Number.parseInt(e.target.value, 10))}
      />
      <span className="text-sm text-muted-foreground">min</span>
    </div>
  )
}

export default function FlightDetailsForm() {
  const { control } = useFormContext()
  const { t } = useTranslation("flights")

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("closeFlight.details.intro")}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          control={control}
          name="flight_hours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("closeFlight.details.flightTime")}
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <DurationInput value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormDescription>{t("closeFlight.details.flightTimeHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="distance_km"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("closeFlight.details.distance")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  className="tabular-nums"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(toNumber(e.target.value, Number.parseFloat))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          control={control}
          name="origin_icao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("closeFlight.details.origin")}
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  maxLength={4}
                  placeholder="LFPN"
                  className="uppercase"
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="destination_icao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("closeFlight.details.destination")}
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  maxLength={4}
                  placeholder="LFOB"
                  className="uppercase"
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          control={control}
          name="flight_type"
          render={({ field }) => {
            // Keep whatever type the plan already has, next to the standard flight rules.
            const options =
              !field.value || FLIGHT_RULE_OPTIONS.some((option) => option.value === field.value)
                ? FLIGHT_RULE_OPTIONS
                : [...FLIGHT_RULE_OPTIONS, { value: field.value, label: flightTypeLabel(field.value) }]

            return (
              <FormItem>
                <FormLabel>
                  {t("closeFlight.details.flightType")}
                  <RequiredMark />
                </FormLabel>
                {/* The select reports an empty value while the plan's own type is not yet among its
                    options: ignoring it keeps the type the plan was prepared with. */}
                <Select onValueChange={(value) => value && field.onChange(value)} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("closeFlight.details.flightTypePlaceholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <FormField
          control={control}
          name="number_of_passengers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("closeFlight.details.passengers")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={20}
                  step={1}
                  className="tabular-nums"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(toNumber(e.target.value, (value) => Number.parseInt(value, 10)))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="weather_conditions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("closeFlight.details.weather")}</FormLabel>
            <FormControl>
              <Textarea
                rows={2}
                // Grows with the weather report instead of scrolling inside the field.
                className="[field-sizing:content]"
                placeholder={t("closeFlight.details.weatherPlaceholder")}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
