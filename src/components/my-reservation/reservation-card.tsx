"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarClock, Plane, FileText, Tag } from "lucide-react"
import Link from "next/link"
import type { Reservation } from "@/interfaces/reservation"

interface ReservationCardProps {
  reservation: Reservation
  onEdit: (reservation: Reservation) => void
  flightCategoryMapping: Record<string, string>
}

export function ReservationCard({ reservation, onEdit, flightCategoryMapping }: ReservationCardProps) {
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

  const statusTranslations = {
    PENDING: "En attente",
    CONFIRMED: "Confirmé",
    CANCELLED: "Annulé",
  }

  const startDate = new Date(reservation.start_time)
  const endDate = new Date(reservation.end_time)
  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)

  return (
    <Card className="h-full flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      <CardHeader className="pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-lg flex items-center">
          <Plane className="h-5 w-5 mr-2 text-primary" />
          {reservation.aircraft.registration_number}
        </CardTitle>
        <Badge variant={getStatusVariant(reservation.status)}>
          {statusTranslations[reservation.status as keyof typeof statusTranslations]}
        </Badge>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className="flex items-start gap-2">
          <CalendarClock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm">
              <span className="font-medium">Début:</span> {format(startDate, "PPP", { locale: fr })}
            </p>
            <p className="text-sm">
              <span className="font-medium">Heure:</span> {format(startDate, "HH:mm", { locale: fr })} -{" "}
              {format(endDate, "HH:mm", { locale: fr })}
            </p>
            <p className="text-xs text-muted-foreground">Durée: {durationHours.toFixed(1)} heure(s)</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">But:</p>
            <p className="text-sm line-clamp-2">{reservation.purpose || "Non spécifié"}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Tag className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Catégorie:</p>
            <p className="text-sm">
              {flightCategoryMapping[reservation.flight_category] || reservation.flight_category}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-2 border-t bg-muted/50">
        <Button size="sm" variant="outline" onClick={() => onEdit(reservation)}>
          Modifier
        </Button>
        {reservation.flights && reservation.flights.length > 0 ? (
          <Link href={`flight-plans/${reservation.flights[0].id}`}>
            <Button size="sm" variant="default">
              Plan de vol
            </Button>
          </Link>
        ) : (
          <Link href={`flight-plans/create/${reservation.id}`}>
            <Button size="sm" variant="default">
              Créer un plan
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  )
}

