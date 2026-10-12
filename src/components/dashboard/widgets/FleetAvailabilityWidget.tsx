"use client"

import { useQuery } from "@apollo/client"
import { Plane } from "lucide-react"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import { AvailabilityStatus } from "@/interfaces/aircraft"
import { WIDGET_REGISTRY } from "@/interfaces/dashboard"
import { Badge } from "@/components/ui/badge"
import WidgetContainer, { WidgetEmpty, WidgetError, WidgetLink, WidgetListSkeleton, WidgetRow } from "../WidgetContainer"
import { aircraftAvailability } from "../widget-config"

const MAX_ROWS = 4

export default function FleetAvailabilityWidget() {
  const { data, loading, error, refetch } = useQuery(GET_AIRCRAFTS)

  const aircrafts: any[] = data?.getAircrafts || []
  const availableCount = aircrafts.filter((a) => a.availability_status === AvailabilityStatus.AVAILABLE).length
  // Available aircraft first: that is what the member is looking for.
  const sorted = [...aircrafts].sort(
    (a, b) =>
      Number(b.availability_status === AvailabilityStatus.AVAILABLE) -
      Number(a.availability_status === AvailabilityStatus.AVAILABLE),
  )
  const hiddenCount = Math.max(sorted.length - MAX_ROWS, 0)

  const renderContent = () => {
    if (loading) return <WidgetListSkeleton rows={MAX_ROWS} />
    if (error && aircrafts.length === 0) return <WidgetError onRetry={() => refetch()} />
    if (aircrafts.length === 0) return <WidgetEmpty icon={Plane} title="Aucun avion dans la flotte" />

    return (
      <div className="space-y-1">
        {sorted.slice(0, MAX_ROWS).map((aircraft) => {
          const status = aircraftAvailability(aircraft.availability_status)
          return (
            <WidgetRow
              key={aircraft.id}
              href="/fleet"
              icon={Plane}
              title={aircraft.registration_number}
              meta={aircraft.model}
              trailing={<Badge variant={status.variant}>{status.label}</Badge>}
            />
          )
        })}
        {hiddenCount > 0 && (
          <p className="pt-1 text-xs text-muted-foreground">
            et {hiddenCount} autre{hiddenCount > 1 ? "s" : ""} avion{hiddenCount > 1 ? "s" : ""}
          </p>
        )}
      </div>
    )
  }

  return (
    <WidgetContainer
      title={WIDGET_REGISTRY["fleet-availability"].label}
      description={
        aircrafts.length > 0
          ? `${availableCount} disponible${availableCount > 1 ? "s" : ""} sur ${aircrafts.length}`
          : undefined
      }
      action={<WidgetLink href="/fleet">Voir la flotte</WidgetLink>}
    >
      {renderContent()}
    </WidgetContainer>
  )
}
