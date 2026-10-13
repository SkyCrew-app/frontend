"use client"

import Link from "next/link"
import { useQuery } from "@apollo/client"
import { ArrowRight, Map, Plane } from "lucide-react"
import { useTranslation } from "react-i18next"
import { formatDate, formatFlightDuration } from "@/lib/format"
import { GET_USER_FLIGHT_PLANS } from "@/graphql/flights"
import { WIDGET_REGISTRY } from "@/interfaces/dashboard"
import { Button } from "@/components/ui/button"
import WidgetContainer, { WidgetEmpty, WidgetError, WidgetLink, WidgetListSkeleton, WidgetRow } from "../WidgetContainer"

const MAX_ROWS = 4

interface RecentFlightsWidgetProps {
  userId: number | null
}

const startTime = (flight: any) => (flight.reservation?.start_time ? new Date(flight.reservation.start_time).getTime() : 0)

export default function RecentFlightsWidget({ userId }: RecentFlightsWidgetProps) {
  const { t } = useTranslation("dashboard")
  const { data, loading, error, refetch } = useQuery(GET_USER_FLIGHT_PLANS, {
    variables: { userId: userId ? Number(userId) : 0 },
    skip: !userId,
  })

  const flights: any[] = data?.getFlightsByUser || []
  const recentFlights = [...flights].sort((a, b) => startTime(b) - startTime(a)).slice(0, MAX_ROWS)

  const renderContent = () => {
    if (!userId || loading) return <WidgetListSkeleton rows={MAX_ROWS} />
    if (error && flights.length === 0) return <WidgetError onRetry={() => refetch()} />
    if (recentFlights.length === 0) {
      return (
        <WidgetEmpty
          icon={Plane}
          title={t("recentFlights.empty")}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/reservations/flight-plans">
                <Map className="h-4 w-4" />
                {t("recentFlights.create")}
              </Link>
            </Button>
          }
        />
      )
    }

    return (
      <div className="space-y-1">
        {recentFlights.map((flight) => (
          <WidgetRow
            key={flight.id}
            href={`/reservations/flight-plans/${flight.id}`}
            icon={Plane}
            title={
              <span className="inline-flex items-center gap-2">
                {flight.origin_icao || "—"}
                <ArrowRight className="h-3 w-3 text-muted-foreground" aria-label={t("recentFlights.to")} />
                {flight.destination_icao || "—"}
              </span>
            }
            meta={
              <>
                {formatDate(flight.reservation?.start_time)}
                {flight.flight_hours ? ` · ${formatFlightDuration(flight.flight_hours)}` : ""}
              </>
            }
          />
        ))}
      </div>
    )
  }

  return (
    <WidgetContainer
      title={WIDGET_REGISTRY["recent-flights"].label}
      action={<WidgetLink href="/reservations/flight-plans">{t("common:actions.seeAll")}</WidgetLink>}
    >
      {renderContent()}
    </WidgetContainer>
  )
}
