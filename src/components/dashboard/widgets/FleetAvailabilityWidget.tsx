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
        <Plane className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Aucun avion dans la flotte</p>
      </div>
    )
  }

  const statusConfig: Record<string, { label: string; className: string }> = {
    available: {
      label: "Disponible",
      className: "bg-success/15 text-success",
    },
    reserved: {
      label: "Réservé",
      className: "bg-info/15 text-info",
    },
    maintenance: {
      label: "Maintenance",
      className: "bg-brand/15 text-brand",
    },
    unavailable: {
      label: "Indisponible",
      className: "bg-destructive/15 text-destructive",
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
            <div className="flex items-center justify-center h-10 w-10 rounded bg-info/10">
              <Plane className="h-5 w-5 text-info rotate-45" />
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
