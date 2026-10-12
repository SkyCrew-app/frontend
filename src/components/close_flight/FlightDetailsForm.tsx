"use client"

import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FLIGHT_RULE_OPTIONS, flightTypeLabel } from "@/components/flight/flight-type"
import WaypointsDisplay from "./WaypointDisplay"

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
        aria-label="Heures de vol"
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
        aria-label="Minutes de vol"
        className="w-20 tabular-nums"
        value={minutes}
        onChange={(e) => update(hours, Number.parseInt(e.target.value, 10))}
      />
      <span className="text-sm text-muted-foreground">min</span>
    </div>
  )
}

export default function FlightDetailsForm() {
  const { control, watch } = useFormContext()
  const waypoints = watch("waypoints")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Vol réalisé</CardTitle>
        <CardDescription>Corrigez ce qui a changé par rapport au plan de vol.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={control}
            name="flight_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Temps de vol
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <DurationInput value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormDescription>Ce temps est inscrit dans votre carnet de vol.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="distance_km"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Distance parcourue (km)</FormLabel>
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
                  Aérodrome de départ (OACI)
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
                  Aérodrome d&apos;arrivée (OACI)
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
                    Type de vol
                    <RequiredMark />
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
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
                <FormLabel>Nombre de passagers</FormLabel>
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
              <FormLabel>Conditions météo rencontrées</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="Ex. : CAVOK, vent 240/08, turbulences légères" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {waypoints && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Points de route du plan</p>
            <WaypointsDisplay waypoints={waypoints} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
