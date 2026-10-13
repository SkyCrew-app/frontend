"use client"

import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
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
  chargedRevenue,
  chartTooltipStyle,
  formatAxisMoney,
} from "./finance-shared"

interface OperatingCostsProps {
  period: string
  date: Date
}

const profitClass = (value: number) => (value >= 0 ? "text-success" : "text-destructive")

export default function OperatingCosts({ period, date }: OperatingCostsProps) {
  const { t } = useTranslation("administration")
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
  // The price per litre set by the club. Without one there is no fuel estimate: no price is
  // made up.
  const fuelPrice: number | null = Number(adminQuery.data?.getAllAdministrations?.[0]?.fuelPrice) || null

  const startDate = period === "monthly" ? startOfMonth(date) : startOfYear(date)
  const endDate = period === "monthly" ? endOfMonth(date) : endOfYear(date)
  const interval = { start: startDate, end: endDate }

  const calculateCosts = (aircraft: Aircraft): OperatingCostItem => {
    const reservations = allReservations.filter(
      (reservation) =>
        reservation.aircraft?.id === aircraft.id &&
        reservation.status === "CONFIRMED" &&
        isWithinInterval(new Date(reservation.start_time), interval),
    )
    const reservationHours = reservations.reduce((total, reservation) => {
      const duration = new Date(reservation.end_time).getTime() - new Date(reservation.start_time).getTime()
      return total + duration / (1000 * 60 * 60)
    }, 0)

    // What the members were actually charged, not the hours at today's rate.
    const revenue = chargedRevenue(reservations)

    const maintenanceCost = allMaintenances
      .filter(
        (maintenance) =>
          maintenance.aircraft?.id === aircraft.id && isWithinInterval(new Date(maintenance.start_date), interval),
      )
      .reduce((total, maintenance) => total + (maintenance.maintenance_cost || 0), 0)

    // The figures are the recorded ones, as in the API's reports: what was charged and what
    // the maintenances cost. Fuel is only an estimate (hours × consumption × price), shown
    // apart and never counted in the result: fuel bills are entered as expenses.
    const fuelEstimate = fuelPrice === null ? null : reservationHours * (aircraft.consumption || 0) * fuelPrice

    return {
      name: aircraft.registration_number,
      fuelEstimate,
      maintenanceCost,
      revenue,
      profit: revenue - maintenanceCost,
    }
  }

  const rows = aircrafts.map(calculateCosts)

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Plane}
        title={t("finance.operating.empty.title")}
        description={t("finance.operating.empty.description")}
      />
    )
  }

  const totals = rows.reduce(
    (acc, row) => ({
      fuelEstimate: acc.fuelEstimate + (row.fuelEstimate ?? 0),
      maintenanceCost: acc.maintenanceCost + row.maintenanceCost,
      revenue: acc.revenue + row.revenue,
      profit: acc.profit + row.profit,
    }),
    { fuelEstimate: 0, maintenanceCost: 0, revenue: 0, profit: 0 },
  )

  const periodLabel = t("finance.period.range", { from: formatDate(startDate), to: formatDate(endDate) })

  return (
    <div className="space-y-6">
      <StatGrid>
        <StatCard
          label={t("finance.operating.flightRevenue")}
          value={formatMoney(totals.revenue)}
          hint={t("finance.operating.confirmedBookings")}
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label={t("finance.labels.maintenance")}
          value={formatMoney(totals.maintenanceCost)}
          hint={t("finance.operating.maintenanceRecorded")}
          icon={Wrench}
          tone="info"
        />
        <StatCard
          label={t("finance.labels.result")}
          value={formatMoney(totals.profit)}
          hint={totals.profit >= 0 ? t("finance.operating.profitable") : t("finance.operating.unprofitable")}
          icon={PiggyBank}
          tone={totals.profit >= 0 ? "success" : "danger"}
        />
        <StatCard
          label={t("finance.operating.fuelEstimated")}
          value={fuelPrice === null ? "—" : formatMoney(totals.fuelEstimate)}
          hint={
            fuelPrice === null
              ? t("finance.operating.fuelEstimateUnavailable")
              : t("finance.operating.fuelEstimateHint", { price: formatMoney(fuelPrice) })
          }
          icon={Fuel}
          tone="warning"
        />
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>{t("finance.operating.chartTitle")}</CardTitle>
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
                <Bar
                  dataKey="revenue"
                  name={t("finance.labels.revenue")}
                  fill={FINANCE_COLORS.revenue}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="maintenanceCost"
                  name={t("finance.labels.maintenance")}
                  fill={FINANCE_COLORS.maintenance}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="profit"
                  name={t("finance.labels.result")}
                  fill={FINANCE_COLORS.result}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("finance.operating.tableTitle")}</CardTitle>
          <CardDescription>{t("finance.operating.tableNote")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common:labels.aircraft")}</TableHead>
                <TableHead className="text-right">{t("finance.labels.revenue")}</TableHead>
                <TableHead className="text-right">{t("finance.labels.maintenance")}</TableHead>
                <TableHead className="text-right">{t("finance.labels.result")}</TableHead>
                <TableHead className="text-right font-normal italic">
                  {t("finance.operating.fuelEstimated")}
                </TableHead>
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
                    {formatMoney(row.maintenanceCost)}
                  </TableCell>
                  <TableCell
                    className={`whitespace-nowrap text-right font-medium tabular-nums ${profitClass(row.profit)}`}
                  >
                    {formatMoney(row.profit)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right italic tabular-nums text-muted-foreground">
                    {row.fuelEstimate === null ? "—" : formatMoney(row.fuelEstimate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>{t("common:labels.total")}</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatMoney(totals.revenue)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatMoney(totals.maintenanceCost)}
                </TableCell>
                <TableCell className={`whitespace-nowrap text-right tabular-nums ${profitClass(totals.profit)}`}>
                  {formatMoney(totals.profit)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right font-normal italic tabular-nums text-muted-foreground">
                  {fuelPrice === null ? "—" : formatMoney(totals.fuelEstimate)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
