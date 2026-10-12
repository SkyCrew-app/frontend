"use client"

import { useState, useMemo } from "react"
import type { ReactNode } from "react"
import { useQuery } from "@apollo/client"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { ErrorState } from "@/components/layout/ErrorState"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { GET_AUDIT_STATISTICS } from "@/graphql/audit"

const AXIS_TICK = { fontSize: 12, fill: "hsl(var(--muted-foreground))" }
const AXIS_LINE = { stroke: "hsl(var(--border))" }

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-card p-2 text-xs shadow-sm">
      {label && <p className="font-medium">{label}</p>}
      {payload.map((entry: any, index: number) => (
        <div key={index} className="mt-1 flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.payload?.color || entry.fill || entry.color }}
          />
          <span>
            {entry.name} : <span className="font-medium tabular-nums">{entry.value}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

function ChartLegend({ payload }: any) {
  return (
    <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(payload ?? []).map((entry: any, index: number) => (
        <li key={index} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.value}
          {entry.payload?.value !== undefined && (
            <span className="font-medium tabular-nums text-foreground">{entry.payload.value}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

interface ChartCardProps {
  title: string
  loading: boolean
  empty: boolean
  children: ReactNode
}

function ChartCard({ title, loading, empty, children }: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : empty ? (
          <p className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">
            Aucun audit sur cette période.
          </p>
        ) : (
          <div className="h-64 w-full">{children}</div>
        )}
      </CardContent>
    </Card>
  )
}

export function AuditStatistics() {
  const [timeRange, setTimeRange] = useState("6")

  const dateVariables = useMemo(() => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - Number.parseInt(timeRange))

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }
  }, [timeRange])

  const { loading, error, data, refetch } = useQuery(GET_AUDIT_STATISTICS, {
    variables: dateVariables,
  })

  const stats = data?.auditStatistics
  const hasData = Boolean(stats && stats.totalAudits > 0)

  const monthlyData = hasData
    ? [...(stats.auditsByMonth ?? [])]
        .sort((a: any, b: any) => (a.year !== b.year ? a.year - b.year : a.month - b.month))
        .map((item: any) => ({
          month: format(new Date(item.year, item.month - 1, 1), "MMM yyyy", { locale: fr }),
          count: item.count,
        }))
    : []

  const aircraftData = hasData
    ? (stats.auditsByAircraft ?? []).map((item: any) => ({
        name: item.registration,
        value: item.auditCount,
        nonConform: item.nonConformCount,
      }))
    : []

  const resultsData = hasData
    ? [
        { name: "Conforme", value: stats.conformCount, color: "hsl(var(--chart-4))" },
        { name: "Avec remarques", value: stats.conformWithRemarksCount, color: "hsl(var(--chart-5))" },
        { name: "Non conforme", value: stats.nonConformCount, color: "hsl(var(--destructive))" },
      ]
    : []

  const statusData = hasData
    ? [
        { name: "En cours", value: stats.openAudits, color: "hsl(var(--chart-2))" },
        { name: "Clôturés", value: stats.closedAudits, color: "hsl(var(--chart-6))" },
      ]
    : []

  const total = (rows: { value: number }[]) => rows.reduce((sum, row) => sum + (row.value || 0), 0)

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Statistiques</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Période des statistiques">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 derniers mois</SelectItem>
            <SelectItem value="6">6 derniers mois</SelectItem>
            <SelectItem value="12">12 derniers mois</SelectItem>
            <SelectItem value="24">24 derniers mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Audits par mois" loading={loading} empty={monthlyData.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} tickMargin={8} />
                <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} tickMargin={8} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="count" name="Audits" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Audits par aéronef" loading={loading} empty={aircraftData.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aircraftData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={AXIS_LINE}
                  width={64}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                <Legend content={<ChartLegend />} />
                <Bar dataKey="value" name="Audits" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="nonConform" name="Non conformes" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Répartition par résultat" loading={loading} empty={total(resultsData) === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={resultsData} dataKey="value" cx="50%" cy="50%" outerRadius={80} labelLine={false}>
                  {resultsData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="hsl(var(--card))" />
                  ))}
                </Pie>
                <Legend content={<ChartLegend />} />
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Répartition par statut" loading={loading} empty={total(statusData) === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" cx="50%" cy="50%" outerRadius={80} labelLine={false}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="hsl(var(--card))" />
                  ))}
                </Pie>
                <Legend content={<ChartLegend />} />
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </section>
  )
}
