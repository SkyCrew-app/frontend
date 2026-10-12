"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/layout/StatCard"
import { CalendarDays, CalendarRange, Clock, Plane } from "lucide-react"
import type { LogbookStats as LogbookStatsType, HoursEntry } from "@/interfaces/logbook"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { formatFlightDuration } from "@/lib/format"
import { flightTypeLabel } from "@/components/flight/flight-type"

interface LogbookStatsProps {
  stats: LogbookStatsType | undefined
  loading: boolean
}

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]

// "2026-03" becomes "mars 26".
function formatMonth(month: string): string {
  const [year, m] = month.split("-")
  const name = MONTHS[parseInt(m) - 1]
  return name ? `${name} ${year.slice(2)}` : month
}

const AXIS_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" }
const TOOLTIP_STYLE = {
  fontSize: 12,
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
}

function HoursBreakdown({ data, title }: { data: HoursEntry[]; title: string }) {
  const total = data.reduce((sum, entry) => sum + entry.hours, 0)
  const sorted = [...data].sort((a, b) => b.hours - a.hours)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun vol sur la période.</p>
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
          label="Heures de vol"
          value={formatFlightDuration(stats?.totalHours ?? 0)}
          hint={totalFlights > 0 ? `Vol le plus long : ${formatFlightDuration(stats?.longestFlight ?? 0)}` : undefined}
          icon={Clock}
          tone="primary"
        />
        <StatCard
          label="Vols"
          value={totalFlights}
          hint={
            totalFlights > 0 ? `${formatFlightDuration(stats?.averageFlightDuration ?? 0)} en moyenne` : undefined
          }
          icon={Plane}
          tone="info"
        />
        <StatCard
          label="30 derniers jours"
          value={formatFlightDuration(stats?.last30DaysHours ?? 0)}
          icon={CalendarDays}
          tone="success"
        />
        <StatCard
          label="90 derniers jours"
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
                <CardTitle className="text-base">Heures de vol par mois</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} unit=" h" />
                    <Tooltip
                      formatter={(value: number) => [formatFlightDuration(value), "Temps de vol"]}
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
            <HoursBreakdown data={stats?.hoursByModel ?? []} title="Heures par modèle d'avion" />
            <HoursBreakdown data={hoursByType} title="Heures par type de vol" />
          </div>
        </div>
      )}
    </div>
  )
}
