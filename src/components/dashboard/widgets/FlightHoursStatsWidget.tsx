"use client"

import { useMemo } from "react"
import { useQuery } from "@apollo/client"
import { Clock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { format, parseISO, startOfMonth } from "date-fns"
import { formatFlightDuration } from "@/lib/format"
import { dateFnsLocale } from "@/lib/i18n"
import { GET_USER_FLIGHT_PLANS } from "@/graphql/flights"
import { WIDGET_REGISTRY } from "@/interfaces/dashboard"
import { Skeleton } from "@/components/ui/skeleton"
import WidgetContainer, { WidgetEmpty, WidgetError, WidgetLink } from "../WidgetContainer"

interface FlightHoursStatsWidgetProps {
  userId: number | null
}

const AXIS_TICK = { fontSize: 12, fill: "hsl(var(--muted-foreground))" }

export default function FlightHoursStatsWidget({ userId }: FlightHoursStatsWidgetProps) {
  const { t } = useTranslation("dashboard")
  const { data, loading, error, refetch } = useQuery(GET_USER_FLIGHT_PLANS, {
    variables: { userId: userId ? Number(userId) : 0 },
    skip: !userId,
  })

  const { chartData, totalHours } = useMemo(() => {
    const flights = data?.getFlightsByUser || []
    let total = 0
    const monthMap: Record<string, number> = {}

    flights.forEach((flight: any) => {
      const hours = flight.flight_hours || 0
      total += hours

      const date = flight.reservation?.start_time
      if (date) {
        const monthKey = format(startOfMonth(parseISO(date)), "yyyy-MM")
        monthMap[monthKey] = (monthMap[monthKey] || 0) + hours
      }
    })

    const last6 = Object.keys(monthMap).sort((a, b) => a.localeCompare(b)).slice(-6)

    const chart = last6.map((key) => ({
      month: format(parseISO(`${key}-01`), "MMM yy", { locale: dateFnsLocale() }),
      heures: Math.round(monthMap[key] * 10) / 10,
    }))

    return { chartData: chart, totalHours: total }
  }, [data])

  const renderContent = () => {
    if (!userId || loading) {
      return (
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-40 w-full" />
        </div>
      )
    }
    if (error && !data) return <WidgetError onRetry={() => refetch()} />
    if (totalHours === 0) return <WidgetEmpty icon={Clock} title={t("flightHours.empty")} />

    return (
      <div>
        <p className="mb-4 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{formatFlightDuration(totalHours)}</span>
          <span className="text-sm text-muted-foreground">{t("flightHours.total")}</span>
        </p>

        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData}>
              <XAxis dataKey="month" tick={AXIS_TICK} stroke="hsl(var(--border))" tickLine={false} />
              <YAxis tick={AXIS_TICK} width={30} stroke="hsl(var(--border))" tickLine={false} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [formatFlightDuration(value), t("flightHours.series")]}
              />
              <Bar dataKey="heures" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    )
  }

  return (
    <WidgetContainer
      title={WIDGET_REGISTRY["flight-hours-stats"].label}
      description={chartData.length > 0 ? t("flightHours.description") : undefined}
      action={<WidgetLink href="/logbook">{t("nav:pages.logbook")}</WidgetLink>}
    >
      {renderContent()}
    </WidgetContainer>
  )
}
