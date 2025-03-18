"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import type { Reservation } from "@/interfaces/reservation"
import { Clock, User, Plane, FileText, Tag, CalendarClock } from "lucide-react"

interface ReservationDetailProps {
  reservation: Reservation
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}

export function ReservationDetail({ reservation, onEdit, onDelete, canEdit }: ReservationDetailProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-green-500">Confirmée</Badge>
      case "PENDING":
        return <Badge className="bg-amber-500">En attente</Badge>
      case "CANCELLED":
        return <Badge className="bg-red-500">Annulée</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const flightCategoryMapping = {
    LOCAL: "Local",
    CROSS_COUNTRY: "Vol longue distance",
    INSTRUCTION: "Instruction",
    TOURISM: "Tourisme",
    TRAINING: "Entraînement",
    MAINTENANCE: "Maintenance",
    PRIVATE: "Privé",
    CORPORATE: "Affaires",
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{reservation.purpose || "Réservation"}</h3>
        {getStatusBadge(reservation.status)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <Plane className="h-5 w-5 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Avion</p>
            <p>{reservation.aircraft.registration_number}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Pilote</p>
            <p>
              {reservation.user?.first_name} {reservation.user?.last_name}
            </p>
            <p className="text-sm text-muted-foreground">{reservation.user?.email}</p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Horaires</p>
            <p>Début: {format(new Date(reservation.start_time), "HH:mm", { locale: fr })}</p>
            <p>Fin: {format(new Date(reservation.end_time), "HH:mm", { locale: fr })}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(reservation.start_time), "EEEE d MMMM yyyy", { locale: fr })}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <CalendarClock className="h-5 w-5 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Durée estimée</p>
            <p>{reservation.estimated_flight_hours} heure(s)</p>
          </div>
        </div>
      </div>

      {(reservation.flight_category || reservation.notes) && <Separator />}

      {reservation.flight_category && (
        <div className="flex items-start gap-3">
          <Tag className="h-5 w-5 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Catégorie de vol</p>
            <p>
              {flightCategoryMapping[reservation.flight_category as keyof typeof flightCategoryMapping] ||
                reservation.flight_category}
            </p>
          </div>
        </div>
      )}

      {reservation.notes && (
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Notes</p>
            <p className="whitespace-pre-wrap">{reservation.notes}</p>
          </div>
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onEdit}>
            Modifier
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            Supprimer
          </Button>
        </div>
      )}
    </div>
  )
}
