"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plane, Cloud, Users } from "lucide-react"
import type { Flight } from "@/interfaces/flight"

interface FlightPlanEditDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  flight: Flight | null
  onSave: (flightType: string, weatherConditions: string, numberOfPassengers: number | undefined) => Promise<void>
  flightTypeTranslations: Record<string, string>
}

export function FlightPlanEditDialog({
  isOpen,
  onOpenChange,
  flight,
  onSave,
  flightTypeTranslations,
}: FlightPlanEditDialogProps) {
  const [flightType, setFlightType] = useState("")
  const [weatherConditions, setWeatherConditions] = useState("")
  const [numberOfPassengers, setNumberOfPassengers] = useState<number | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (flight) {
      setFlightType(flight.flight_type || "")
      setWeatherConditions(flight.weather_conditions || "")
      setNumberOfPassengers(flight.number_of_passengers)
    }
  }, [flight])

  const handleSave = async () => {
    if (!flight) return

    setIsSubmitting(true)
    try {
      await onSave(flightType, weatherConditions, numberOfPassengers)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!flight) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogTitle>Modifier le plan de vol</DialogTitle>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <Plane className="h-5 w-5 text-primary" />
            <div>
              <span className="font-medium">{flight.origin_icao}</span> →{" "}
              <span className="font-medium">{flight.destination_icao}</span>
              {flight.distance_km && (
                <span className="text-sm text-muted-foreground ml-2">({flight.distance_km.toFixed(0)} km)</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="flight-type" className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                Type de vol
              </Label>
              <Select value={flightType} onValueChange={setFlightType}>
                <SelectTrigger id="flight-type">
                  <SelectValue placeholder="Type de vol" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(flightTypeTranslations).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weather-conditions" className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                Conditions météo
              </Label>
              <Input
                id="weather-conditions"
                value={weatherConditions}
                onChange={(e) => setWeatherConditions(e.target.value)}
                placeholder="Ex: CAVOK, Nuageux, Pluie légère..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="number-of-passengers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Nombre de passagers
              </Label>
              <Input
                id="number-of-passengers"
                type="number"
                min="0"
                max="20"
                value={numberOfPassengers === undefined ? "" : numberOfPassengers}
                onChange={(e) => {
                  const value = e.target.value === "" ? undefined : Number.parseInt(e.target.value)
                  setNumberOfPassengers(value)
                }}
                placeholder="0"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
