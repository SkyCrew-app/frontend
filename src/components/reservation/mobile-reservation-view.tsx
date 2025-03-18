"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import type { Reservation } from "@/interfaces/reservation"
import { Clock, User, Calendar, Plus } from "lucide-react"
import { Label } from "@/components/ui/label"

interface MobileReservationViewProps {
  currentDate: Date
  aircrafts: any[]
  reservations: Reservation[]
  selectedAircraft: number | null
  setSelectedAircraft: (id: number | null) => void
  onCreateReservation: () => void
  onViewReservation: (reservation: Reservation) => void
}

export function MobileReservationView({
  currentDate,
  aircrafts,
  reservations,
  selectedAircraft,
  setSelectedAircraft,
  onCreateReservation,
  onViewReservation,
}: MobileReservationViewProps) {
  const filteredReservations = selectedAircraft
    ? reservations.filter((r) => r.aircraft.id === selectedAircraft)
    : reservations

  const sortedReservations = [...filteredReservations].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-100 text-green-800 border-green-200"
      case "PENDING":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-blue-100 text-blue-800 border-blue-200"
    }
  }

  const handleAircraftSelection = (value: string) => {
    if (value === "-1") {
      setSelectedAircraft(null)
    } else {
      const aircraftId = Number.parseInt(value)
      if (!isNaN(aircraftId)) {
        setSelectedAircraft(aircraftId)
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="aircraft-select" className="mb-1 block">
            Sélectionner un avion
          </Label>
          <Select value={selectedAircraft?.toString() || "-1"} onValueChange={handleAircraftSelection}>
            <SelectTrigger id="aircraft-select">
              <SelectValue placeholder="Tous les avions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-1">Tous les avions</SelectItem>
              {aircrafts.map((aircraft) => (
                <SelectItem key={aircraft.id} value={aircraft.id.toString()}>
                  {aircraft.registration_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={onCreateReservation} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle réservation
        </Button>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium mb-3">
          Réservations du {format(currentDate, "EEEE d MMMM yyyy", { locale: fr })}
        </h3>

        {sortedReservations.length > 0 ? (
          <Accordion type="single" collapsible className="space-y-2">
            {sortedReservations.map((reservation) => (
              <AccordionItem
                key={reservation.id}
                value={reservation.id.toString()}
                className={`border rounded-lg ${getStatusColor(reservation.status)}`}
              >
                <AccordionTrigger className="px-4 py-2 hover:no-underline">
                  <div className="flex flex-col items-start text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{reservation.aircraft.registration_number}</span>
                      <Badge variant="outline" className="ml-2">
                        {format(new Date(reservation.start_time), "HH:mm")} -{" "}
                        {format(new Date(reservation.end_time), "HH:mm")}
                      </Badge>
                    </div>
                    <span className="text-sm">{reservation.purpose || "Réservation"}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 pt-1">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {reservation.user?.first_name} {reservation.user?.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{reservation.estimated_flight_hours} heure(s) estimée(s)</span>
                    </div>
                    {reservation.notes && <p className="text-sm mt-2">{reservation.notes}</p>}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => onViewReservation(reservation)}
                    >
                      Voir détails
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Aucune réservation pour {selectedAircraft ? "cet avion" : "cette journée"}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
