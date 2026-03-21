"use client"

import { useQuery } from "@apollo/client"
import { GET_USER_FLIGHT_PLANS } from "@/graphql/flights"
import { Skeleton } from "@/components/ui/skeleton"
import { Plane, ArrowRight } from "lucide-react"
import Link from "next/link"

interface RecentFlightsWidgetProps {
  userId: number | null
}

export default function RecentFlightsWidget({ userId }: RecentFlightsWidgetProps) {
  const { data, loading } = useQuery(GET_USER_FLIGHT_PLANS, {
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

  const flights = data?.getFlightsByUser || []
  const recentFlights = [...flights]
    .sort((a: any, b: any) => {
      const dateA = a.reservation?.start_time ? new Date(a.reservation.start_time).getTime() : 0
      const dateB = b.reservation?.start_time ? new Date(b.reservation.start_time).getTime() : 0
      return dateB - dateA
    })
    .slice(0, 5)

  if (recentFlights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Plane className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">Aucun vol récent</p>
        <Link
          href="/reservations/flight-plans"
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 mt-2"
        >
          Créer un plan de vol
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {recentFlights.map((flight: any) => (
        <Link
          key={flight.id}
          href={`/reservations/flight-plans/${flight.id}`}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-center h-10 w-10 rounded bg-indigo-50 dark:bg-indigo-950">
            <Plane className="h-5 w-5 text-indigo-500 rotate-45" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium flex items-center gap-1">
              {flight.origin_icao || "---"}
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              {flight.destination_icao || "---"}
            </p>
            <p className="text-xs text-muted-foreground">
              {flight.flight_hours ? `${flight.flight_hours}h` : "--"} |{" "}
              {flight.reservation?.start_time
                ? new Date(flight.reservation.start_time).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Date inconnue"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
