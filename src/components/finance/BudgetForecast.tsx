"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
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
import { GET_BUDGET_FORECAST } from "@/graphql/finance"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatCard } from "@/components/layout/StatCard"
import { ErrorState } from "@/components/layout/ErrorState"
import { formatMoney } from "@/lib/format"
import { dateFnsLocale } from "@/lib/i18n"
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

// Nothing booked yet is not a surplus: zero stays neutral.
const profitClass = (value: number) => (value > 0 ? "text-success" : value < 0 ? "text-destructive" : "")

export default function BudgetForecast() {
  const { t } = useTranslation("administration")
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
        description={t("finance.forecast.error")}
        onRetry={() => queryResults.forEach((query) => query.refetch())}
      />
    )
  }

  const chartData: ChartDataItem[] = queryResults.map((query, index) => {
    const forecast = query.data?.generateBudgetForecast
    const month = format(periods[index].startDate, "MMM yyyy", { locale: dateFnsLocale() })

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

  const monthlyAverage = (value: number) =>
    t("finance.forecast.monthlyAverage", { amount: formatMoney(value / MONTHS) })

  return (
    <div className="space-y-6">
      <StatGrid className="lg:grid-cols-3">
        <StatCard
          label={t("finance.forecast.revenue")}
          value={formatMoney(totals.revenus)}
          hint={monthlyAverage(totals.revenus)}
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label={t("finance.forecast.expenses")}
          value={formatMoney(totals.depenses)}
          hint={monthlyAverage(totals.depenses)}
          icon={Receipt}
          tone="warning"
        />
        <StatCard
          label={t("finance.forecast.netResult")}
          value={formatMoney(totals.resultatNet)}
          hint={
            totals.resultatNet >= 0
              ? t("finance.forecast.surplus", { months: MONTHS })
              : t("finance.forecast.deficit", { months: MONTHS })
          }
          icon={PiggyBank}
          tone={totals.resultatNet >= 0 ? "success" : "danger"}
          className="sm:col-span-2 lg:col-span-1"
        />
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>{t("finance.forecast.title", { months: MONTHS })}</CardTitle>
          <CardDescription>{t("finance.forecast.description")}</CardDescription>
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
                  name={t("finance.labels.revenue")}
                  stroke={FINANCE_COLORS.revenue}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="depenses"
                  name={t("finance.labels.expenses")}
                  stroke={FINANCE_COLORS.expense}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="resultatNet"
                  name={t("finance.labels.netResult")}
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
          <CardTitle>{t("finance.forecast.byMonth")}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Wide screens: a table; phones and tablets: one block per month. */}
          <Table className="hidden lg:table">
            <TableHeader>
              <TableRow>
                <TableHead>{t("finance.period.month")}</TableHead>
                <TableHead className="text-right">{t("finance.labels.revenue")}</TableHead>
                <TableHead className="text-right">{t("finance.labels.expenses")}</TableHead>
                <TableHead className="text-right">{t("finance.labels.netResult")}</TableHead>
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
                <TableCell>{t("common:labels.total")}</TableCell>
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
          <ul className="divide-y lg:hidden">
            {chartData.map((row) => (
              <li key={row.month} className="space-y-2 py-3 first:pt-0 last:pb-0">
                <p className="font-medium">{row.month}</p>
                <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">{t("finance.labels.revenue")}</dt>
                  <dd className="text-right tabular-nums">{formatMoney(row.revenus)}</dd>
                  <dt className="text-muted-foreground">{t("finance.labels.expenses")}</dt>
                  <dd className="text-right tabular-nums">{formatMoney(row.depenses)}</dd>
                  <dt className="text-muted-foreground">{t("finance.labels.netResult")}</dt>
                  <dd className={`text-right font-medium tabular-nums ${profitClass(row.resultatNet)}`}>{formatMoney(row.resultatNet)}</dd>
                </dl>
              </li>
            ))}
              <li key="total" className="space-y-2 py-3 first:pt-0 last:pb-0 font-medium">
                <p className="font-medium">{t("common:labels.total")}</p>
                <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">{t("finance.labels.revenue")}</dt>
                  <dd className="text-right tabular-nums">{formatMoney(totals.revenus)}</dd>
                  <dt className="text-muted-foreground">{t("finance.labels.expenses")}</dt>
                  <dd className="text-right tabular-nums">{formatMoney(totals.depenses)}</dd>
                  <dt className="text-muted-foreground">{t("finance.labels.netResult")}</dt>
                  <dd className={`text-right font-medium tabular-nums ${profitClass(totals.resultatNet)}`}>{formatMoney(totals.resultatNet)}</dd>
                </dl>
              </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
