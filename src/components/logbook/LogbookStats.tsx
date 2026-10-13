"use client"

import { format } from "date-fns"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/layout/StatCard"
import { CalendarDays, CalendarRange, Clock, Plane } from "lucide-react"
import type { LogbookStats as LogbookStatsType, HoursEntry } from "@/interfaces/logbook"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { formatFlightDuration } from "@/lib/format"
import { dateFnsLocale } from "@/lib/i18n"
import { flightTypeLabel } from "@/components/flight/flight-type"

interface LogbookStatsProps {
  stats: LogbookStatsType | undefined
  loading: boolean
}

// "2026-03" becomes "mars 26" ("Mar 26" in English).
function formatMonth(month: string): string {
  const [year, m] = month.split("-")
  const index = parseInt(m) - 1
  if (!(index >= 0 && index < 12)) return month
  const name = format(new Date(2000, index, 1), "MMM", { locale: dateFnsLocale() })
  return `${name} ${year.slice(2)}`
}

const AXIS_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" }
const TOOLTIP_STYLE = {
  fontSize: 12,
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
}

function HoursBreakdown({ data, title }: { data: HoursEntry[]; title: string }) {
  const { t } = useTranslation("flights")
  const total = data.reduce((sum, entry) => sum + entry.hours, 0)
  const sorted = [...data].sort((a, b) => b.hours - a.hours)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("logbook.stats.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {sorted.map((entry) => (
              <li key={entry.label} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{entry.label}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">{formatFlightDuration(entry.hours)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${total > 0 ? Math.max(2, (entry.hours / total) * 100) : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default function LogbookStats({ stats, loading }: LogbookStatsProps) {
  const { t } = useTranslation("flights")

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const monthlyData = (stats?.monthlyHours ?? []).map((entry) => ({
    ...entry,
    label: formatMonth(entry.month),
  }))

  const totalFlights = stats?.totalFlights ?? 0
  const hoursByType = (stats?.hoursByCategory ?? []).map((entry) => ({ ...entry, label: flightTypeLabel(entry.label) }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t("logbook.stats.flightHours")}
          value={formatFlightDuration(stats?.totalHours ?? 0)}
          hint={
            totalFlights > 0
              ? t("logbook.stats.longestFlight", { duration: formatFlightDuration(stats?.longestFlight ?? 0) })
              : undefined
          }
          icon={Clock}
          tone="primary"
        />
        <StatCard
          label={t("logbook.stats.flights")}
          value={totalFlights}
          hint={
            totalFlights > 0
              ? t("logbook.stats.average", { duration: formatFlightDuration(stats?.averageFlightDuration ?? 0) })
              : undefined
          }
          icon={Plane}
          tone="info"
        />
        <StatCard
          label={t("logbook.stats.last30Days")}
          value={formatFlightDuration(stats?.last30DaysHours ?? 0)}
          icon={CalendarDays}
          tone="success"
        />
        <StatCard
          label={t("logbook.stats.last90Days")}
          value={formatFlightDuration(stats?.last90DaysHours ?? 0)}
          icon={CalendarRange}
          tone="neutral"
        />
      </div>

      {totalFlights > 0 && (
        <div className="space-y-4">
          {monthlyData.length > 1 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("logbook.stats.monthlyTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} unit=" h" />
                    <Tooltip
                      formatter={(value: number) => [formatFlightDuration(value), t("logbook.stats.tooltipFlightTime")]}
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      cursor={{ fill: "hsl(var(--muted))" }}
                    />
                    <Bar dataKey="hours" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <HoursBreakdown data={stats?.hoursByModel ?? []} title={t("logbook.stats.byModel")} />
            <HoursBreakdown data={hoursByType} title={t("logbook.stats.byType")} />
          </div>
        </div>
      )}
    </div>
  )
}
