"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidePanel } from "@/components/layout/SidePanel"
import type { Flight } from "@/interfaces/flight"
import { FLIGHT_RULE_OPTIONS, flightTypeLabel } from "@/components/flight/flight-type"

interface FlightPlanEditDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  flight: Flight | null
  /** `weatherConditions` is undefined when the list did not load it: it must then be left untouched. */
  onSave: (
    flightType: string,
    weatherConditions: string | undefined,
    numberOfPassengers: number | undefined,
  ) => Promise<void>
}

export function FlightPlanEditDialog({ isOpen, onOpenChange, flight, onSave }: FlightPlanEditDialogProps) {
  const [flightType, setFlightType] = useState("")
  const [weatherConditions, setWeatherConditions] = useState("")
  const [numberOfPassengers, setNumberOfPassengers] = useState<number | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Only offer the weather field when the current value is known, so it is never wiped by mistake.
  const weatherKnown = flight?.weather_conditions !== undefined

  useEffect(() => {
    if (flight && isOpen) {
      setFlightType(flight.flight_type || "")
      setWeatherConditions(flight.weather_conditions || "")
      setNumberOfPassengers(flight.number_of_passengers)
    }
  }, [flight, isOpen])

  if (!flight) return null

  const typeOptions = FLIGHT_RULE_OPTIONS.some((option) => option.value === flight.flight_type)
    ? FLIGHT_RULE_OPTIONS
    : [...FLIGHT_RULE_OPTIONS, { value: flight.flight_type, label: flightTypeLabel(flight.flight_type) }]

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSave(flightType, weatherKnown ? weatherConditions : undefined, numberOfPassengers)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SidePanel
      open={isOpen}
      onOpenChange={(next) => {
        if (!next && isSubmitting) return
        onOpenChange(next)
      }}
      title="Modifier le plan de vol"
      description={`${flight.origin_icao} → ${flight.destination_icao}. La route se modifie en créant un nouveau plan.`}
      size="md"
      onSubmit={handleSubmit}
      submitting={isSubmitting}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="flight-type">Type de vol</Label>
            <Select value={flightType} onValueChange={setFlightType}>
              <SelectTrigger id="flight-type">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="number-of-passengers">Passagers</Label>
            <Input
              id="number-of-passengers"
              type="number"
              inputMode="numeric"
              min={0}
              max={20}
              step={1}
              value={numberOfPassengers === undefined ? "" : numberOfPassengers}
              onChange={(e) => {
                const value = e.target.value === "" ? undefined : Number.parseInt(e.target.value, 10)
                setNumberOfPassengers(Number.isNaN(value) ? undefined : value)
              }}
              placeholder="0"
            />
          </div>
        </div>

        {weatherKnown && (
          <div className="space-y-2">
            <Label htmlFor="weather-conditions">Conditions météo</Label>
            <Input
              id="weather-conditions"
              value={weatherConditions}
              onChange={(e) => setWeatherConditions(e.target.value)}
              placeholder="Ex. : CAVOK, vent 240/08"
            />
          </div>
        )}
      </div>
    </SidePanel>
  )
}
