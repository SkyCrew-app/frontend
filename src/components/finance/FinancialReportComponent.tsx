"use client"

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
import { FileBarChart, PiggyBank, Receipt, TrendingUp, Users } from "lucide-react"
import { GET_FINANCIAL_REPORTS } from "@/graphql/finance"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/layout/StatCard"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { formatDate, formatMoney } from "@/lib/format"
import i18n from "@/lib/i18n"
import {
  CHART_GRID,
  CHART_MARGIN,
  CHART_TICK,
  FINANCE_COLORS,
  FinanceTabSkeleton,
  StatGrid,
  chartTooltipStyle,
  formatAxisMoney,
  formatPercentChange,
  percentChange,
} from "./finance-shared"

interface FinancialReport {
  id: string
  report_date: string
  total_revenue: number
  total_expense: number
  net_profit: number
  average_revenue_per_member: number | null
  recommendations?: string | null
}

const trendHint = (change: number | null) =>
  change === null
    ? i18n.t("administration:finance.summary.noPreviousReport")
    : i18n.t("administration:finance.summary.lastReport", { change: formatPercentChange(change) })

export default function FinancialReportComponent() {
  const { t } = useTranslation("administration")
  const { loading, error, data, refetch } = useQuery(GET_FINANCIAL_REPORTS)

  if (loading && !data) return <FinanceTabSkeleton />
  if (error) return <ErrorState onRetry={() => refetch()} />

  // Oldest first: the order of the chart and of the trends.
  const reports: FinancialReport[] = [...(data?.financialReports ?? [])]
    .filter((report: FinancialReport) => report && typeof report.report_date === "string")
    .sort(
      (a: FinancialReport, b: FinancialReport) =>
        new Date(a.report_date).getTime() - new Date(b.report_date).getTime(),
    )

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={FileBarChart}
        title={t("finance.summary.empty.title")}
        description={t("finance.summary.empty.description")}
      />
    )
  }

  const chartData = reports.map((report) => ({
    date: formatDate(report.report_date),
    revenue: report.total_revenue,
    expense: report.total_expense,
    profit: report.net_profit,
  }))

  const last = reports[reports.length - 1]
  const previous = reports.length > 1 ? reports[reports.length - 2] : undefined

  const totalRevenue = reports.reduce((sum, report) => sum + report.total_revenue, 0)
  const totalExpense = reports.reduce((sum, report) => sum + report.total_expense, 0)
  const totalProfit = reports.reduce((sum, report) => sum + report.net_profit, 0)

  // Newest first in the table, each row compared with the report before it.
  const rows = reports
    .map((report, index) => ({
      report,
      change: index > 0 ? percentChange(reports[index - 1].net_profit, report.net_profit) : null,
    }))
    .reverse()

  return (
    <div className="space-y-6">
      <StatGrid>
        <StatCard
          label={t("finance.summary.totalRevenue")}
          value={formatMoney(totalRevenue)}
          hint={trendHint(percentChange(previous?.total_revenue, last.total_revenue))}
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label={t("finance.summary.totalExpenses")}
          value={formatMoney(totalExpense)}
          hint={trendHint(percentChange(previous?.total_expense, last.total_expense))}
          icon={Receipt}
          tone="warning"
        />
        <StatCard
          label={t("finance.summary.totalResult")}
          value={formatMoney(totalProfit)}
          hint={trendHint(percentChange(previous?.net_profit, last.net_profit))}
          icon={PiggyBank}
          tone={totalProfit >= 0 ? "success" : "danger"}
        />
        <StatCard
          label={t("finance.labels.averageRevenuePerMember")}
          value={formatMoney(last.average_revenue_per_member)}
          hint={t("finance.summary.reportOf", { date: formatDate(last.report_date) })}
          icon={Users}
          tone="info"
        />
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>{t("finance.summary.trend.title")}</CardTitle>
          <CardDescription>{t("finance.summary.trend.description", { count: reports.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="date" tick={CHART_TICK} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
                <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} tickFormatter={formatAxisMoney} width={64} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatMoney(value)} />
                <Legend verticalAlign="top" height={32} iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={0} stroke={CHART_GRID} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name={t("finance.labels.revenue")}
                  stroke={FINANCE_COLORS.revenue}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name={t("finance.labels.expenses")}
                  stroke={FINANCE_COLORS.expense}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name={t("finance.labels.netResult")}
                  stroke={FINANCE_COLORS.result}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("finance.summary.reports.title")}</CardTitle>
          <CardDescription>{t("finance.summary.reports.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common:labels.date")}</TableHead>
                <TableHead className="text-right">{t("finance.labels.revenue")}</TableHead>
                <TableHead className="text-right">{t("finance.labels.expenses")}</TableHead>
                <TableHead className="text-right">{t("finance.labels.netResult")}</TableHead>
                <TableHead className="text-right">{t("finance.labels.averageRevenuePerMember")}</TableHead>
                <TableHead className="text-right">{t("finance.summary.reports.resultChange")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ report, change }) => (
                <TableRow key={report.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(report.report_date)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    {formatMoney(report.total_revenue)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    {formatMoney(report.total_expense)}
                  </TableCell>
                  <TableCell
                    className={`whitespace-nowrap text-right font-medium tabular-nums ${
                      report.net_profit >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatMoney(report.net_profit)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    {formatMoney(report.average_revenue_per_member)}
                  </TableCell>
                  <TableCell className="text-right">
                    {change === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Badge variant={change >= 0 ? "success" : "danger"} className="tabular-nums">
                        {formatPercentChange(change)}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {last.recommendations && (
        <Card>
          <CardHeader>
            <CardTitle>{t("finance.summary.recommendations.title")}</CardTitle>
            <CardDescription>
              {t("finance.summary.recommendations.description", { date: formatDate(last.report_date) })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm">{last.recommendations}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
