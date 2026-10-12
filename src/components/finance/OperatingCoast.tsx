"use client"

import { useQuery } from "@apollo/client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Fuel, PiggyBank, Plane, TrendingUp, Wrench } from "lucide-react"
import { startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatCard } from "@/components/layout/StatCard"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { GET_RESERVATIONS } from "@/graphql/reservation"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import { GET_ALL_MAINTENANCES } from "@/graphql/maintenance"
import { GET_ADMINISTRATION } from "@/graphql/settings"
import { formatDate, formatMoney } from "@/lib/format"
import type { Aircraft, Maintenance, OperatingCostItem, Reservation } from "@/interfaces/finance"
import {
  CHART_GRID,
  CHART_MARGIN,
  CHART_TICK,
  FINANCE_COLORS,
  FinanceTabSkeleton,
  StatGrid,
  chartTooltipStyle,
  formatAxisMoney,
} from "./finance-shared"

interface OperatingCostsProps {
  period: string
  date: Date
}

const profitClass = (value: number) => (value >= 0 ? "text-success" : "text-destructive")

export default function OperatingCosts({ period, date }: OperatingCostsProps) {
  const aircraftsQuery = useQuery(GET_AIRCRAFTS)
  const reservationsQuery = useQuery(GET_RESERVATIONS)
  const maintenancesQuery = useQuery(GET_ALL_MAINTENANCES)
  const adminQuery = useQuery(GET_ADMINISTRATION)
  const queries = [aircraftsQuery, reservationsQuery, maintenancesQuery, adminQuery]

  if (queries.some((query) => query.loading)) return <FinanceTabSkeleton />

  if (queries.some((query) => query.error)) {
    return <ErrorState onRetry={() => queries.forEach((query) => query.refetch())} />
  }

  const aircrafts: Aircraft[] = aircraftsQuery.data?.getAircrafts ?? []
  const allReservations: Reservation[] = reservationsQuery.data?.reservations ?? []
  const allMaintenances: Maintenance[] = maintenancesQuery.data?.getAllMaintenances ?? []
  const fuelPrice: number = adminQuery.data?.getAdministration?.[0]?.fuelPrice || 1.5

  const startDate = period === "monthly" ? startOfMonth(date) : startOfYear(date)
  const endDate = period === "monthly" ? endOfMonth(date) : endOfYear(date)
  const interval = { start: startDate, end: endDate }

  const calculateCosts = (aircraft: Aircraft): OperatingCostItem => {
    const reservationHours = allReservations
      .filter(
        (reservation) =>
          reservation.aircraft?.id === aircraft.id &&
          reservation.status === "CONFIRMED" &&
          isWithinInterval(new Date(reservation.start_time), interval),
      )
      .reduce((total, reservation) => {
        const duration = new Date(reservation.end_time).getTime() - new Date(reservation.start_time).getTime()
        return total + duration / (1000 * 60 * 60)
      }, 0)

    const revenue = reservationHours * (aircraft.hourly_cost || 0)

    const maintenanceCost = allMaintenances
      .filter(
        (maintenance) =>
          maintenance.aircraft?.id === aircraft.id && isWithinInterval(new Date(maintenance.start_date), interval),
      )
      .reduce((total, maintenance) => total + (maintenance.maintenance_cost || 0), 0)

    const fuelCost = reservationHours * (aircraft.consumption || 0) * fuelPrice

    return {
      name: aircraft.registration_number,
      fuelCost,
      maintenanceCost,
      revenue,
      profit: revenue - (fuelCost + maintenanceCost),
    }
  }

  const rows = aircrafts.map(calculateCosts)

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Plane}
        title="Aucun avion dans la flotte"
        description="Les coûts par avion s'afficheront ici dès qu'un avion aura été ajouté."
      />
    )
  }

  const totals = rows.reduce(
    (acc, row) => ({
      fuelCost: acc.fuelCost + row.fuelCost,
      maintenanceCost: acc.maintenanceCost + row.maintenanceCost,
      revenue: acc.revenue + row.revenue,
      profit: acc.profit + row.profit,
    }),
    { fuelCost: 0, maintenanceCost: 0, revenue: 0, profit: 0 },
  )

  const periodLabel = `Du ${formatDate(startDate)} au ${formatDate(endDate)}`

  return (
    <div className="space-y-6">
      <StatGrid>
        <StatCard
          label="Revenus des vols"
          value={formatMoney(totals.revenue)}
          hint="Réservations confirmées"
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Carburant"
          value={formatMoney(totals.fuelCost)}
          hint={`Estimé à ${formatMoney(fuelPrice)} le litre`}
          icon={Fuel}
          tone="warning"
        />
        <StatCard label="Maintenance" value={formatMoney(totals.maintenanceCost)} icon={Wrench} tone="info" />
        <StatCard
          label="Résultat"
          value={formatMoney(totals.profit)}
          hint={totals.profit >= 0 ? "Flotte rentable sur la période" : "Coûts supérieurs aux revenus"}
          icon={PiggyBank}
          tone={totals.profit >= 0 ? "success" : "danger"}
        />
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>Coûts et revenus par avion</CardTitle>
          <CardDescription>{periodLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="name" tick={CHART_TICK} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
                <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} tickFormatter={formatAxisMoney} width={64} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  cursor={{ fill: "hsl(var(--muted))" }}
                  formatter={(value: number) => formatMoney(value)}
                />
                <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenus" fill={FINANCE_COLORS.revenue} radius={[4, 4, 0, 0]} />
                <Bar dataKey="fuelCost" name="Carburant" fill={FINANCE_COLORS.fuel} radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="maintenanceCost"
                  name="Maintenance"
                  fill={FINANCE_COLORS.maintenance}
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="profit" name="Résultat" fill={FINANCE_COLORS.result} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Détail par avion</CardTitle>
          <CardDescription>
            Revenus calculés sur les heures réservées, carburant sur la consommation horaire de chaque avion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Avion</TableHead>
                <TableHead className="text-right">Revenus</TableHead>
                <TableHead className="text-right">Carburant</TableHead>
                <TableHead className="text-right">Maintenance</TableHead>
                <TableHead className="text-right">Résultat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="whitespace-nowrap font-medium">{row.name}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    {formatMoney(row.revenue)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    {formatMoney(row.fuelCost)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    {formatMoney(row.maintenanceCost)}
                  </TableCell>
                  <TableCell
                    className={`whitespace-nowrap text-right font-medium tabular-nums ${profitClass(row.profit)}`}
                  >
                    {formatMoney(row.profit)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatMoney(totals.revenue)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatMoney(totals.fuelCost)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatMoney(totals.maintenanceCost)}
                </TableCell>
                <TableCell className={`whitespace-nowrap text-right tabular-nums ${profitClass(totals.profit)}`}>
                  {formatMoney(totals.profit)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
