"use client"

import { useQuery } from "@apollo/client"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { GET_BUDGET_FORECAST } from "@/graphql/finance"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Loader2, TrendingUp, TrendingDown, ArrowRight } from "lucide-react"
import { addMonths, format, startOfMonth, endOfMonth } from "date-fns"
import { fr } from "date-fns/locale"
import { useMemo } from "react"
import type { BudgetForecastResponse, ChartDataItem } from "@/interfaces/finance"

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

export default function BudgetForecast() {
  const currentDate = new Date()

  // Créer les périodes de manière mémoïsée
  const periods = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => ({
      startDate: startOfMonth(addMonths(currentDate, index)),
      endDate: endOfMonth(addMonths(currentDate, index)),
    }))
  }, [currentDate])

  // Appeler useQuery pour chaque mois de manière statique
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

  // Vérifier si une des requêtes est en cours de chargement
  if (queryResults.some((query) => query.loading)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-info" />
          <p className="text-muted-foreground animate-pulse">Calcul des prévisions budgétaires...</p>
        </div>
      </div>
    )
  }

  // Vérifier s'il y a des erreurs
  const errors = queryResults.filter((query) => query.error)
  if (errors.length > 0) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl">
        <AlertTriangle className="h-5 w-5" />
        <div>
          <AlertTitle className="text-lg font-semibold">Erreur de prévision</AlertTitle>
          <AlertDescription>
            {errors.map((query, index) => (
              <div key={index}>{query.error?.message}</div>
            ))}
          </AlertDescription>
        </div>
      </Alert>
    )
  }

  // Créer les données pour le graphique
  const chartData: ChartDataItem[] = queryResults.map((query, index) => {
    const forecast = query.data?.generateBudgetForecast
    const month = addMonths(currentDate, index)

    return {
      month: format(month, "MMM yyyy", { locale: fr }),
      revenus: forecast?.revenueForecast || 0,
      depenses: forecast?.expenseForecast || 0,
      resultatNet: forecast?.netForecast || 0,
    }
  })

  // Calculer les totaux
  const totals = chartData.reduce(
    (acc, curr) => ({
      revenus: acc.revenus + curr.revenus,
      depenses: acc.depenses + curr.depenses,
      resultatNet: acc.resultatNet + curr.resultatNet,
    }),
    { revenus: 0, depenses: 0, resultatNet: 0 },
  )

  // Calculer les tendances
  const calculateTrend = (data: ChartDataItem[], key: "revenus" | "depenses" | "resultatNet") => {
    if (data.length < 2) return 0
    const firstValue = data[0][key]
    const lastValue = data[data.length - 1][key]
    return firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0
  }

  const revenueTrend = calculateTrend(chartData, "revenus")
  const expenseTrend = calculateTrend(chartData, "depenses")
  const profitTrend = calculateTrend(chartData, "resultatNet")

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <Card className="border-t-4 border-t-info">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-info">Prévisions budgétaires</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Prévisions détaillées mois par mois sur les 6 prochains mois
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <motion.div variants={fadeIn} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 10,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickLine={{ stroke: "hsl(var(--border))" }} />
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
                  labelFormatter={(label) => `Mois: ${label}`}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingTop: "10px" }} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
                <Line
                  type="monotone"
                  dataKey="revenus"
                  name="Revenus prévus"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "hsl(var(--chart-2))", strokeWidth: 2, stroke: "hsl(var(--card))" }}
                  activeDot={{ r: 6, fill: "hsl(var(--chart-2))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="depenses"
                  name="Dépenses prévues"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "hsl(var(--destructive))", strokeWidth: 2, stroke: "hsl(var(--card))" }}
                  activeDot={{ r: 6, fill: "hsl(var(--destructive))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="resultatNet"
                  name="Résultat net prévu"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: "hsl(var(--chart-4))", strokeWidth: 2, stroke: "hsl(var(--card))" }}
                  activeDot={{ r: 6, fill: "hsl(var(--chart-4))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div variants={fadeIn} className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-info/10 border-info/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-info">Revenus prévus</h3>
                  <div className={`flex items-center ${revenueTrend >= 0 ? "text-success" : "text-destructive"}`}>
                    {revenueTrend >= 0 ? (
                      <TrendingUp className="h-5 w-5 mr-1" />
                    ) : (
                      <TrendingDown className="h-5 w-5 mr-1" />
                    )}
                    <span className="font-medium">{Math.abs(revenueTrend).toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-info">{totals.revenus.toLocaleString()} €</p>
                <div className="mt-4 text-sm text-info">
                  <div className="flex items-center">
                    <ArrowRight className="h-4 w-4 mr-1" />
                    <span>Moyenne mensuelle: {(totals.revenus / 6).toLocaleString()} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-destructive/10 border-destructive/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-destructive">Dépenses prévues</h3>
                  <div className={`flex items-center ${expenseTrend <= 0 ? "text-success" : "text-destructive"}`}>
                    {expenseTrend >= 0 ? (
                      <TrendingUp className="h-5 w-5 mr-1" />
                    ) : (
                      <TrendingDown className="h-5 w-5 mr-1" />
                    )}
                    <span className="font-medium">{Math.abs(expenseTrend).toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-destructive">{totals.depenses.toLocaleString()} €</p>
                <div className="mt-4 text-sm text-destructive">
                  <div className="flex items-center">
                    <ArrowRight className="h-4 w-4 mr-1" />
                    <span>Moyenne mensuelle: {(totals.depenses / 6).toLocaleString()} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-success/10 border-success/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-success">Résultat net prévu</h3>
                  <div className={`flex items-center ${profitTrend >= 0 ? "text-success" : "text-destructive"}`}>
                    {profitTrend >= 0 ? (
                      <TrendingUp className="h-5 w-5 mr-1" />
                    ) : (
                      <TrendingDown className="h-5 w-5 mr-1" />
                    )}
                    <span className="font-medium">{Math.abs(profitTrend).toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-success">{totals.resultatNet.toLocaleString()} €</p>
                <div className="mt-4 text-sm text-success">
                  <div className="flex items-center">
                    <ArrowRight className="h-4 w-4 mr-1" />
                    <span>Moyenne mensuelle: {(totals.resultatNet / 6).toLocaleString()} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeIn}>
            {totals.resultatNet < 0 ? (
              <Alert className="bg-destructive/10 border-destructive/30 text-destructive">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <AlertTitle className="text-lg font-semibold">Alerte de déficit prévu</AlertTitle>
                  <AlertDescription>
                    Les prévisions indiquent un déficit total de {Math.abs(totals.resultatNet).toLocaleString()} € sur
                    les 6 prochains mois. Nous vous recommandons de revoir votre stratégie budgétaire.
                  </AlertDescription>
                </div>
              </Alert>
            ) : (
              <Alert className="bg-success/10 border-success/30 text-success">
                <TrendingUp className="h-5 w-5 text-success" />
                <div>
                  <AlertTitle className="text-lg font-semibold">Prévisions positives</AlertTitle>
                  <AlertDescription>
                    Les prévisions indiquent un résultat net positif de {totals.resultatNet.toLocaleString()} € sur les
                    6 prochains mois. Continuez sur cette lancée!
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
