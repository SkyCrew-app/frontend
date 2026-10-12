"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@apollo/client"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { PiggyBank, Receipt, TrendingUp } from "lucide-react"
import { addMonths, format, startOfMonth, endOfMonth } from "date-fns"
import { fr } from "date-fns/locale"
import { GET_BUDGET_FORECAST } from "@/graphql/finance"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatCard } from "@/components/layout/StatCard"
import { ErrorState } from "@/components/layout/ErrorState"
import { formatMoney } from "@/lib/format"
import type { BudgetForecastResponse, ChartDataItem } from "@/interfaces/finance"
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

const MONTHS = 6

const profitClass = (value: number) => (value >= 0 ? "text-success" : "text-destructive")

export default function BudgetForecast() {
  // Fixed for the life of the component, so the six queries keep the same variables.
  const [currentDate] = useState(() => new Date())

  const periods = useMemo(
    () =>
      Array.from({ length: MONTHS }, (_, index) => ({
        startDate: startOfMonth(addMonths(currentDate, index)),
        endDate: endOfMonth(addMonths(currentDate, index)),
      })),
    [currentDate],
  )

  // One query per month, called statically to respect the rules of hooks.
  const month1Query = useQuery<BudgetForecastResponse>(GET_BUDGET_FORECAST, {
    variables: { startDate: periods[0].startDate, endDate: periods[0].endDate },
  })
  const month2Query = useQuery<BudgetForecastResponse>(GET_BUDGET_FORECAST, {
    variables: { startDate: periods[1].startDate, endDate: periods[1].endDate },
  })
  const month3Query = useQuery<BudgetForecastResponse>(GET_BUDGET_FORECAST, {
    variables: { startDate: periods[2].startDate, endDate: periods[2].endDate },
  })
  const month4Query = useQuery<BudgetForecastResponse>(GET_BUDGET_FORECAST, {
    variables: { startDate: periods[3].startDate, endDate: periods[3].endDate },
  })
  const month5Query = useQuery<BudgetForecastResponse>(GET_BUDGET_FORECAST, {
    variables: { startDate: periods[4].startDate, endDate: periods[4].endDate },
  })
  const month6Query = useQuery<BudgetForecastResponse>(GET_BUDGET_FORECAST, {
    variables: { startDate: periods[5].startDate, endDate: periods[5].endDate },
  })

  const queryResults = [month1Query, month2Query, month3Query, month4Query, month5Query, month6Query]

  if (queryResults.some((query) => query.loading)) return <FinanceTabSkeleton stats={3} />

  if (queryResults.some((query) => query.error)) {
    return (
      <ErrorState
        description="Les prévisions n'ont pas pu être calculées. Vérifiez votre connexion puis réessayez."
        onRetry={() => queryResults.forEach((query) => query.refetch())}
      />
    )
  }

  const chartData: ChartDataItem[] = queryResults.map((query, index) => {
    const forecast = query.data?.generateBudgetForecast
    const month = format(periods[index].startDate, "MMM yyyy", { locale: fr })

    return {
      month,
      revenus: forecast?.revenueForecast || 0,
      depenses: forecast?.expenseForecast || 0,
      resultatNet: forecast?.netForecast || 0,
    }
  })

  const totals = chartData.reduce(
    (acc, curr) => ({
      revenus: acc.revenus + curr.revenus,
      depenses: acc.depenses + curr.depenses,
      resultatNet: acc.resultatNet + curr.resultatNet,
    }),
    { revenus: 0, depenses: 0, resultatNet: 0 },
  )

  const monthlyAverage = (value: number) => `Moyenne mensuelle : ${formatMoney(value / MONTHS)}`

  return (
    <div className="space-y-6">
      <StatGrid className="lg:grid-cols-3">
        <StatCard
          label="Revenus prévus"
          value={formatMoney(totals.revenus)}
          hint={monthlyAverage(totals.revenus)}
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Dépenses prévues"
          value={formatMoney(totals.depenses)}
          hint={monthlyAverage(totals.depenses)}
          icon={Receipt}
          tone="warning"
        />
        <StatCard
          label="Résultat net prévu"
          value={formatMoney(totals.resultatNet)}
          hint={totals.resultatNet >= 0 ? "Excédent sur 6 mois" : "Déficit sur 6 mois"}
          icon={PiggyBank}
          tone={totals.resultatNet >= 0 ? "success" : "danger"}
          className="sm:col-span-2 lg:col-span-1"
        />
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>Prévisions sur 6 mois</CardTitle>
          <CardDescription>Estimation mois par mois, à partir du mois en cours.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="month" tick={CHART_TICK} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
                <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} tickFormatter={formatAxisMoney} width={64} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatMoney(value)} />
                <Legend verticalAlign="top" height={32} iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={0} stroke={CHART_GRID} />
                <Line
                  type="monotone"
                  dataKey="revenus"
                  name="Revenus"
                  stroke={FINANCE_COLORS.revenue}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="depenses"
                  name="Dépenses"
                  stroke={FINANCE_COLORS.expense}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="resultatNet"
                  name="Résultat net"
                  stroke={FINANCE_COLORS.result}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Détail par mois</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mois</TableHead>
                <TableHead className="text-right">Revenus</TableHead>
                <TableHead className="text-right">Dépenses</TableHead>
                <TableHead className="text-right">Résultat net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartData.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="whitespace-nowrap">{row.month}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    {formatMoney(row.revenus)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    {formatMoney(row.depenses)}
                  </TableCell>
                  <TableCell
                    className={`whitespace-nowrap text-right font-medium tabular-nums ${profitClass(row.resultatNet)}`}
                  >
                    {formatMoney(row.resultatNet)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatMoney(totals.revenus)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatMoney(totals.depenses)}
                </TableCell>
                <TableCell className={`whitespace-nowrap text-right tabular-nums ${profitClass(totals.resultatNet)}`}>
                  {formatMoney(totals.resultatNet)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
