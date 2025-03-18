"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plane, Calendar, MapPin, Users, Cloud, Clock } from "lucide-react"
import Link from "next/link"
import type { Flight } from "@/interfaces/flight"

interface FlightPlanCardProps {
  flight: Flight
  onEdit: (flight: Flight) => void
  flightTypeTranslations: Record<string, string>
  reservationStatusTranslations: Record<string, string>
}

export function FlightPlanCard({
  flight,
  onEdit,
  flightTypeTranslations,
  reservationStatusTranslations,
}: FlightPlanCardProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "secondary"
      case "CONFIRMED":
        return "default"
      case "CANCELLED":
        return "destructive"
      default:
        return "default"
    }
  }

  return (
    <Card className="h-full flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      <CardHeader className="pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-lg flex items-center">
          <Plane className="h-5 w-5 mr-2 text-primary" />
          <span className="truncate">
            {flight.origin_icao} → {flight.destination_icao}
          </span>
        </CardTitle>
        <Badge variant={flight.reservation ? getStatusVariant(flight.reservation.status) : "secondary"}>
          {flight.reservation
            ? reservationStatusTranslations[flight.reservation.status as keyof typeof reservationStatusTranslations]
            : "Sans réservation"}
        </Badge>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        {flight.reservation && (
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm">
                <span className="font-medium">Date:</span>{" "}
                {format(new Date(flight.reservation.start_time), "PPP", { locale: fr })}
              </p>
              <p className="text-sm">
                <span className="font-medium">Heure:</span>{" "}
                {format(new Date(flight.reservation.start_time), "HH:mm", { locale: fr })} -{" "}
                {format(new Date(flight.reservation.end_time), "HH:mm", { locale: fr })}
              </p>
              <p className="text-sm">
                <span className="font-medium">Avion:</span> {flight.reservation.aircraft.registration_number}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-sm">
              <span className="font-medium">Distance:</span>{" "}
              {flight.distance_km ? `${flight.distance_km.toFixed(0)} km` : "Non spécifiée"}
            </p>
            {flight.waypoints && flight.waypoints.length > 0 && (
              <p className="text-sm">
                <span className="font-medium">Waypoints:</span> {flight.waypoints.join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-sm">
                <span className="font-medium">Heures:</span> {flight.flight_hours.toFixed(1)}h
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-sm">
                <span className="font-medium">Passagers:</span> {flight.number_of_passengers || "0"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Cloud className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-sm">
              <span className="font-medium">Type:</span>{" "}
              {flightTypeTranslations[flight.flight_type as keyof typeof flightTypeTranslations] || flight.flight_type}
            </p>
            {flight.weather_conditions && (
              <p className="text-sm line-clamp-1">
                <span className="font-medium">Météo:</span> {flight.weather_conditions}
              </p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-2 border-t bg-muted/50">
        <Button size="sm" variant="outline" onClick={() => onEdit(flight)}>
          Modifier
        </Button>
        <Link href={`flight-plans/${flight.id}`}>
          <Button size="sm" variant="default">
            Détails
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
