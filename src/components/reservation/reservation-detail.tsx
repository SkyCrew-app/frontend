"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import type { Reservation } from "@/interfaces/reservation"
import { Clock, User, Plane, FileText, Tag, CalendarClock } from "lucide-react"
import { useTranslations } from "next-intl"

interface ReservationDetailProps {
  reservation: Reservation
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}

export function ReservationDetail({ reservation, onEdit, onDelete, canEdit }: ReservationDetailProps) {
  const t = useTranslations("reservation")
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-green-500">{t('confirmated')}</Badge>
      case "PENDING":
        return <Badge className="bg-amber-500">{t('pending')}</Badge>
      case "CANCELLED":
        return <Badge className="bg-red-500">{t('cancelled')}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const flightCategoryMapping = {
    LOCAL: t('local'),
    CROSS_COUNTRY: t('crossCountry'),
    INSTRUCTION: t('instruction'),
    TOURISM: t('tourism'),
    TRAINING: t('training'),
    MAINTENANCE: t('maintenance'),
    PRIVATE: t('private'),
    CORPORATE: t('corporate'),
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
            <p className="text-sm font-medium">{t('plane')}</p>
            <p>{reservation.aircraft.registration_number}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t('pilote')}</p>
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
            <p className="text-sm font-medium">{t('hourly')}</p>
            <p>{t('start')} : {format(new Date(reservation.start_time), "HH:mm", { locale: fr })}</p>
            <p>{t('end')} : {format(new Date(reservation.end_time), "HH:mm", { locale: fr })}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(reservation.start_time), "EEEE d MMMM yyyy", { locale: fr })}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <CalendarClock className="h-5 w-5 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t('estimatedDate')}</p>
            <p>{reservation.estimated_flight_hours} {t('hours')}</p>
          </div>
        </div>
      </div>

      {(reservation.flight_category || reservation.notes) && <Separator />}

      {reservation.flight_category && (
        <div className="flex items-start gap-3">
          <Tag className="h-5 w-5 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t('flightCategory')}</p>
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
            <p className="text-sm font-medium">{t('notes')}</p>
            <p className="whitespace-pre-wrap">{reservation.notes}</p>
          </div>
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onEdit}>
            {t('edit')}
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            {t('delete')}
          </Button>
        </div>
      )}
    </div>
  )
}
