"use client"

import Link from "next/link"
import { useQuery } from "@apollo/client"
import { CalendarClock, CalendarPlus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { formatDateTime } from "@/lib/format"
import { reservationStatus } from "@/lib/reservation-status"
import { GET_USER_RESERVATIONS } from "@/graphql/reservation"
import { WIDGET_REGISTRY } from "@/interfaces/dashboard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import WidgetContainer, { WidgetEmpty, WidgetError, WidgetLink, WidgetListSkeleton, WidgetRow } from "../WidgetContainer"

const MAX_ROWS = 4

interface UpcomingReservationsWidgetProps {
  userId: number | null
}

export default function UpcomingReservationsWidget({ userId }: UpcomingReservationsWidgetProps) {
  const { t } = useTranslation("dashboard")
  const { data, loading, error, refetch } = useQuery(GET_USER_RESERVATIONS, {
    variables: { userId: userId ? Number(userId) : 0 },
    skip: !userId,
  })

  const reservations: any[] = data?.userReservations || []
  const now = Date.now()
  const upcoming = reservations
    .filter((r) => new Date(r.start_time).getTime() > now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, MAX_ROWS)

  const renderContent = () => {
    if (!userId || loading) return <WidgetListSkeleton rows={MAX_ROWS} />
    if (error && reservations.length === 0) return <WidgetError onRetry={() => refetch()} />
    if (upcoming.length === 0) {
      return (
        <WidgetEmpty
          icon={CalendarClock}
          title={t("upcomingReservations.empty")}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/reservations?new=1">
                <CalendarPlus className="h-4 w-4" />
                {t("quickActions.book")}
              </Link>
            </Button>
          }
        />
      )
    }

    return (
      <div className="space-y-1">
        {upcoming.map((reservation) => {
          const status = reservationStatus(reservation.status)
          return (
            <WidgetRow
              key={reservation.id}
              href="/reservations/my"
              icon={CalendarClock}
              title={reservation.aircraft?.registration_number || t("upcomingReservations.unknownAircraft")}
              meta={formatDateTime(reservation.start_time)}
              trailing={<Badge variant={status.variant}>{status.label}</Badge>}
            />
          )
        })}
      </div>
    )
  }

  return (
    <WidgetContainer
      title={WIDGET_REGISTRY["upcoming-reservations"].label}
      action={<WidgetLink href="/reservations/my">{t("common:actions.seeAll")}</WidgetLink>}
    >
      {renderContent()}
    </WidgetContainer>
  )
}
