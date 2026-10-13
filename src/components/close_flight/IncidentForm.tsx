"use client"

import { useEffect } from "react"
import { useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const RequiredMark = () => (
  <span className="text-destructive" aria-hidden="true">
    {" "}
    *
  </span>
)

// Codes the API expects; their labels are read from the translations.
const SEVERITIES = ["low", "medium", "high"] as const
const PRIORITIES = ["low", "medium", "high"] as const
const CATEGORIES = ["mechanical", "electrical", "weather", "human_error", "other"] as const

// Value of a datetime-local input in local time (toISOString would shift it to UTC).
const toDateTimeLocal = (value: unknown) => {
  if (!value) return ""
  const date = new Date(value as string | number | Date)
  return Number.isNaN(date.getTime()) ? "" : format(date, "yyyy-MM-dd'T'HH:mm")
}

export default function IncidentForm() {
  const { control, watch, setValue, getValues } = useFormContext()
  const { t } = useTranslation("flights")
  const incidentOccurred = watch("incidentOccurred")

  useEffect(() => {
    if (incidentOccurred) {
      // A new incident is always created open; the club follows it up afterwards.
      setValue("incident_status", "Ouvert")
      if (!getValues("incident_date")) {
        setValue("incident_date", new Date())
      }
    }
  }, [incidentOccurred, setValue, getValues])

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="incidentOccurred"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel>{t("closeFlight.incident.occurred")}</FormLabel>
              <FormDescription>{t("closeFlight.incident.occurredHint")}</FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked)
                  if (checked) {
                    setValue("incident_status", "Ouvert")
                    if (!getValues("incident_date")) {
                      setValue("incident_date", new Date())
                    }
                  } else {
                    setValue("incident_description", "")
                    setValue("damage_report", "")
                    setValue("corrective_actions", "")
                    setValue("incident_date", undefined)
                    setValue("severity_level", undefined)
                    setValue("incident_priority", undefined)
                    setValue("incident_category", undefined)
                  }
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {incidentOccurred && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={control}
              name="incident_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("closeFlight.incident.dateTime")}</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={toDateTimeLocal(field.value)}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="incident_category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("common:labels.category")}
                    <RequiredMark />
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("closeFlight.incident.categoryPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {t(`closeFlight.incident.category.${category}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={control}
              name="severity_level"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>
                    {t("closeFlight.incident.severityLabel")}
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-wrap gap-x-6 gap-y-2"
                    >
                      {SEVERITIES.map((severity) => (
                        <FormItem key={severity} className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={severity} />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {t(`closeFlight.incident.severity.${severity}`)}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="incident_priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("closeFlight.incident.priorityLabel")}
                    <RequiredMark />
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("closeFlight.incident.priorityPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {t(`closeFlight.incident.priority.${priority}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={control}
            name="incident_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("common:labels.description")}
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("closeFlight.incident.descriptionPlaceholder")}
                    className="resize-none"
                    rows={3}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={control}
              name="damage_report"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("closeFlight.incident.damage")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("closeFlight.incident.damagePlaceholder")}
                      className="resize-none"
                      rows={2}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="corrective_actions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("closeFlight.incident.correctiveActions")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("closeFlight.incident.correctiveActionsPlaceholder")}
                      className="resize-none"
                      rows={2}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      )}
    </div>
  )
}
