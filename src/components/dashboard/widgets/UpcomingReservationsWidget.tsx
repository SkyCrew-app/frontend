"use client"

import { reservationStatus } from "@/lib/reservation-status"
import { useQuery } from "@apollo/client"
import { GET_USER_RESERVATIONS } from "@/graphql/reservation"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Plane } from "lucide-react"
import Link from "next/link"

interface UpcomingReservationsWidgetProps {
  userId: number | null
}

export default function UpcomingReservationsWidget({ userId }: UpcomingReservationsWidgetProps) {
  const { data, loading } = useQuery(GET_USER_RESERVATIONS, {
    variables: { userId: userId ? Number(userId) : 0 },
    skip: !userId,
  })

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const reservations = data?.userReservations || []
  const now = new Date()
  const upcoming = reservations
    .filter((r: any) => new Date(r.start_time) > now)
    .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5)

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Aucune réservation à venir</p>
        <Link
          href="/reservations"
          className="text-sm text-info hover:text-info mt-2"
        >
          Réserver un avion
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {upcoming.map((reservation: any) => (
        <Link
          key={reservation.id}
          href={`/reservations`}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-center h-10 w-10 rounded bg-info/10">
            <Plane className="h-5 w-5 text-info rotate-45" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {reservation.aircraft?.registration_number || "Avion"}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(reservation.start_time).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <Badge variant={reservationStatus(reservation.status).variant} className="text-xs">
            {reservationStatus(reservation.status).label}
          </Badge>
        </Link>
      ))}
    </div>
  )
}
