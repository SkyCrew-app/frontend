"use client"

import { useQuery } from "@apollo/client"
import { motion } from "framer-motion"
import { GET_FINANCIAL_REPORTS } from "@/graphql/finance"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Lightbulb } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface FinancialReport {
  id: string
  report_date: string
  total_revenue: number
  total_expense: number
  net_profit: number
  average_revenue_per_member: number
  recommendations?: string
}

interface ChartData {
  date: string
  revenue: number
  expense: number
  profit: number
}

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export default function FinancialReportComponent() {
  const { loading, error, data } = useQuery(GET_FINANCIAL_REPORTS)

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-info" />
          <p className="text-muted-foreground animate-pulse">Chargement des données financières...</p>
        </div>
      </div>
    )

  if (error)
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl">
        <AlertTriangle className="h-5 w-5" />
        <div>
          <AlertTitle className="text-lg font-semibold">Erreur de chargement</AlertTitle>
          <AlertDescription>
            Une erreur s'est produite lors du chargement des rapports financiers : {error.message}
          </AlertDescription>
        </div>
      </Alert>
    )

  const reports: FinancialReport[] =
    data?.financialReports
      ?.filter((report: FinancialReport) => report && typeof report.report_date === "string")
      .map((report: FinancialReport) => ({
        ...report,
        report_date: new Date(report.report_date),
      }))
      .sort((a: any, b: any) => a.report_date.getTime() - b.report_date.getTime()) || []

  if (reports.length === 0) {
    return (
      <Alert className="mx-auto max-w-2xl bg-warning/10 border-warning/30 text-warning">
        <AlertTriangle className="h-5 w-5 text-warning" />
        <div>
          <AlertTitle className="text-lg font-semibold">Aucune donnée disponible</AlertTitle>
          <AlertDescription className="text-warning">
            Aucun rapport financier valide n'a été trouvé. Veuillez vérifier les données ou contacter l'administrateur.
          </AlertDescription>
        </div>
      </Alert>
    )
  }

  const chartData: ChartData[] = reports.map((report: any) => ({
    date: report.report_date.toLocaleDateString(),
    revenue: report.total_revenue,
    expense: report.total_expense,
    profit: report.net_profit,
  }))

  // Calculer les tendances
  const calculateTrend = (data: number[]) => {
    if (data.length < 2) return 0
    return ((data[data.length - 1] - data[data.length - 2]) / data[data.length - 2]) * 100
  }

  const revenueTrend = calculateTrend(reports.map((r) => r.total_revenue))
  const expenseTrend = calculateTrend(reports.map((r) => r.total_expense))
  const profitTrend = calculateTrend(reports.map((r) => r.net_profit))

  // Calculer les totaux
  const totalRevenue = reports.reduce((sum, report) => sum + report.total_revenue, 0)
  const totalExpense = reports.reduce((sum, report) => sum + report.total_expense, 0)
  const totalProfit = reports.reduce((sum, report) => sum + report.net_profit, 0)

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-8">
      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={fadeIn}>
          <Card className="hover:shadow-md transition-shadow border-t-4 border-t-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Revenus totaux</span>
                <Badge
                  className={`${revenueTrend >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"} flex items-center`}
                >
                  {revenueTrend >= 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {Math.abs(revenueTrend).toFixed(1)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-info">{totalRevenue.toLocaleString()} €</div>
              <p className="text-sm text-muted-foreground mt-1">{reports.length} période(s) analysée(s)</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn}>
          <Card className="hover:shadow-md transition-shadow border-t-4 border-t-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Dépenses totales</span>
                <Badge
                  className={`${expenseTrend <= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"} flex items-center`}
                >
                  {expenseTrend >= 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {Math.abs(expenseTrend).toFixed(1)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{totalExpense.toLocaleString()} €</div>
              <p className="text-sm text-muted-foreground mt-1">{reports.length} période(s) analysée(s)</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn}>
          <Card className="hover:shadow-md transition-shadow border-t-4 border-t-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Profit net</span>
                <Badge
                  className={`${profitTrend >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"} flex items-center`}
                >
                  {profitTrend >= 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {Math.abs(profitTrend).toFixed(1)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{totalProfit.toLocaleString()} €</div>
              <p className="text-sm text-muted-foreground mt-1">{reports.length} période(s) analysée(s)</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={fadeIn}>
        <Card >
          <CardHeader>
            <CardTitle>Évolution financière</CardTitle>
            <CardDescription>Vue d'ensemble des performances financières sur la période</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickLine={{ stroke: "hsl(var(--border))" }} />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderRadius: "8px",
                      boxShadow: "0 4px 8px -2px hsl(var(--shadow-color) / 0.12)",
                      border: "1px solid hsl(var(--border))",
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} €`, undefined]}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingTop: "10px" }} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenus"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "hsl(var(--chart-2))", strokeWidth: 2, stroke: "hsl(var(--card))" }}
                    activeDot={{ r: 6, fill: "hsl(var(--chart-2))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="Dépenses"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "hsl(var(--destructive))", strokeWidth: 2, stroke: "hsl(var(--card))" }}
                    activeDot={{ r: 6, fill: "hsl(var(--destructive))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Profit net"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "hsl(var(--chart-4))", strokeWidth: 2, stroke: "hsl(var(--card))" }}
                    activeDot={{ r: 6, fill: "hsl(var(--chart-4))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeIn}>
        <Card >
          <CardHeader>
            <CardTitle>Détails des rapports financiers</CardTitle>
            <CardDescription>Historique complet des rapports financiers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead>Revenus totaux</TableHead>
                    <TableHead>Dépenses totales</TableHead>
                    <TableHead>Profit net</TableHead>
                    <TableHead>Revenu moyen par membre</TableHead>
                    <TableHead>Tendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report: any, index: number) => {
                    const prevReport = index > 0 ? reports[index - 1] : null
                    const profitTrend = prevReport
                      ? ((report.net_profit - prevReport.net_profit) / prevReport.net_profit) * 100
                      : 0

                    return (
                      <TableRow key={report.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>{report.report_date.toLocaleDateString()}</TableCell>
                        <TableCell>{report.total_revenue.toLocaleString()} €</TableCell>
                        <TableCell>{report.total_expense.toLocaleString()} €</TableCell>
                        <TableCell
                          className={report.net_profit >= 0 ? "text-success font-medium" : "text-destructive font-medium"}
                        >
                          {report.net_profit.toLocaleString()} €
                        </TableCell>
                        <TableCell>{report.average_revenue_per_member?.toLocaleString() || "N/A"} €</TableCell>
                        <TableCell>
                          {prevReport && (
                            <Badge
                              className={`${profitTrend >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"} flex items-center`}
                            >
                              {profitTrend >= 0 ? (
                                <TrendingUp className="mr-1 h-3 w-3" />
                              ) : (
                                <TrendingDown className="mr-1 h-3 w-3" />
                              )}
                              {Math.abs(profitTrend).toFixed(1)}%
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {reports.length > 0 && reports[reports.length - 1].recommendations && (
        <motion.div variants={fadeIn}>
          <Card className="border-l-4 border-l-warning">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="mr-2 h-5 w-5 text-warning" />
                Recommandations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-warning/10 p-4 rounded-lg border border-warning/30 text-warning">
                <p className="italic">{reports[reports.length - 1].recommendations}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
