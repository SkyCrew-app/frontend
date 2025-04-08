"use client"

import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plane } from 'lucide-react'
import WaypointsDisplay from "./WaypointDisplay"

const formatNumber = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined) return "";
  return Number(value).toFixed(decimals);
};

export default function FlightDetailsForm() {
  const { control } = useFormContext()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Plane className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Détails du vol</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={control}
            name="flight_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Heures de vol</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ? formatNumber(field.value) : ""}
                    onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="flight_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type de vol</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="number_of_passengers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de passagers</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={(e) => field.onChange(Number.parseInt(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="origin_icao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aéroport de départ (ICAO)</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={4} />
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
                <FormLabel>Aéroport d'arrivée (ICAO)</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={4} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="distance_km"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Distance (km)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ? formatNumber(field.value) : ""}
                    onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="estimated_flight_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temps de vol estimé (heures)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ? formatNumber(field.value) : ""}
                    onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
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
              <FormLabel>Conditions météorologiques</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="waypoints"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Points de cheminement</FormLabel>
              <FormControl>
                <Input type="hidden" {...field} />
              </FormControl>
              {field.value && <WaypointsDisplay waypoints={field.value} />}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="encoded_polyline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Polyline encodée</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="departure_airport_info"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Informations sur l'aéroport de départ</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="arrival_airport_info"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Informations sur l'aéroport d'arrivée</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
