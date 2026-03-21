"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Plane, Hash, Clock, Trophy, Calendar, TrendingUp } from "lucide-react"
import type { LogbookStats as LogbookStatsType, HoursEntry } from "@/interfaces/logbook"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

interface LogbookStatsProps {
  stats: LogbookStatsType | undefined
  loading: boolean
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-")
  const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"]
  return `${months[parseInt(m) - 1]} ${year.slice(2)}`
}

function HoursChart({ data, title }: { data: HoursEntry[]; title: string }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune donn&eacute;e</p>
        </CardContent>
      </Card>
    )
  }

  if (data.length <= 2) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.map((entry) => (
              <li key={entry.label} className="flex items-center justify-between text-sm">
                <span className="font-medium">{entry.label}</span>
                <span className="text-muted-foreground">{formatHours(entry.hours)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number) => [formatHours(value), "Heures"]}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

export default function LogbookStats({ stats, loading }: LogbookStatsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const monthlyData = (stats?.monthlyHours ?? []).map((entry) => ({
    ...entry,
    label: formatMonth(entry.month),
  }))

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Heures totales" value={stats ? formatHours(stats.totalHours) : "0h"} icon={Plane} />
        <StatCard title="Total vols" value={String(stats?.totalFlights ?? 0)} icon={Hash} />
        <StatCard
          title="Dur&eacute;e moyenne"
          value={stats ? formatHours(stats.averageFlightDuration) : "0h"}
          icon={Clock}
        />
        <StatCard
          title="Vol le plus long"
          value={stats ? formatHours(stats.longestFlight) : "0h"}
          icon={Trophy}
        />
        <StatCard
          title="30 derniers jours"
          value={stats ? formatHours(stats.last30DaysHours) : "0h"}
          icon={Calendar}
        />
        <StatCard
          title="90 derniers jours"
          value={stats ? formatHours(stats.last90DaysHours) : "0h"}
          icon={TrendingUp}
        />
      </div>

      {/* Monthly evolution chart */}
      {monthlyData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              &Eacute;volution mensuelle des heures de vol
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [formatHours(value), "Heures"]}
                  contentStyle={{ fontSize: 12, backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Breakdown charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <HoursChart data={stats?.hoursByModel ?? []} title="R&eacute;partition par mod&egrave;le" />
        <HoursChart data={stats?.hoursByCategory ?? []} title="R&eacute;partition par type" />
      </div>
    </div>
  )
}
