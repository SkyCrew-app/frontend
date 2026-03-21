"use client"

import { useQuery } from "@apollo/client"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plane } from "lucide-react"
import Link from "next/link"

export default function FleetAvailabilityWidget() {
  const { data, loading } = useQuery(GET_AIRCRAFTS)

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

  const aircrafts = data?.getAircrafts || []

  if (aircrafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Plane className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">Aucun avion dans la flotte</p>
      </div>
    )
  }

  const statusConfig: Record<string, { label: string; className: string }> = {
    available: {
      label: "Disponible",
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    },
    reserved: {
      label: "Réservé",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    },
    maintenance: {
      label: "Maintenance",
      className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    },
    unavailable: {
      label: "Indisponible",
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    },
  }

  return (
    <div className="space-y-3">
      {aircrafts.map((aircraft: any) => {
        const status = statusConfig[aircraft.availability_status] || statusConfig["unavailable"]
        return (
          <Link
            key={aircraft.id}
            href="/fleet"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-center h-10 w-10 rounded bg-blue-50 dark:bg-blue-950">
              <Plane className="h-5 w-5 text-blue-500 rotate-45" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{aircraft.registration_number}</p>
              <p className="text-xs text-muted-foreground">{aircraft.model}</p>
            </div>
            <Badge variant="secondary" className={`text-xs ${status.className}`}>
              {status.label}
            </Badge>
          </Link>
        )
      })}
    </div>
  )
}
