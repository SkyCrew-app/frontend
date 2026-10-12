"use client"

import { useEffect } from "react"
import { useFormContext } from "react-hook-form"
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

const SEVERITIES = [
  { value: "low", label: "Faible" },
  { value: "medium", label: "Moyenne" },
  { value: "high", label: "Élevée" },
]

// Value of a datetime-local input in local time (toISOString would shift it to UTC).
const toDateTimeLocal = (value: unknown) => {
  if (!value) return ""
  const date = new Date(value as string | number | Date)
  return Number.isNaN(date.getTime()) ? "" : format(date, "yyyy-MM-dd'T'HH:mm")
}

export default function IncidentForm() {
  const { control, watch, setValue, getValues } = useFormContext()
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
              <FormLabel>Un incident est survenu pendant ce vol</FormLabel>
              <FormDescription>
              Panne, anomalie, dommage ou événement de sécurité. Le signalement est transmis au club avec la clôture.
            </FormDescription>
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
                  <FormLabel>Date et heure de l&apos;incident</FormLabel>
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
                    Catégorie
                    <RequiredMark />
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mechanical">Mécanique</SelectItem>
                      <SelectItem value="electrical">Électrique</SelectItem>
                      <SelectItem value="weather">Météorologique</SelectItem>
                      <SelectItem value="human_error">Erreur humaine</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
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
                    Gravité
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-wrap gap-x-6 gap-y-2"
                    >
                      {SEVERITIES.map((severity) => (
                        <FormItem key={severity.value} className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={severity.value} />
                          </FormControl>
                          <FormLabel className="font-normal">{severity.label}</FormLabel>
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
                    Priorité de traitement
                    <RequiredMark />
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une priorité" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Basse</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="high">Haute</SelectItem>
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
                  Description
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Que s'est-il passé, à quel moment du vol, dans quelles conditions ?"
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
                  <FormLabel>Dommages constatés</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex. : pneu avant gauche à plat, aucune autre trace"
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
                  <FormLabel>Actions correctives</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ce qui a été fait, ou ce qu'il reste à faire avant le prochain vol"
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
