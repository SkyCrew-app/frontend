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
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
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
      <Card className="shadow-lg border-t-4 border-t-indigo-500">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-indigo-700">Prévisions Budgétaires</CardTitle>
          <CardDescription className="text-sm text-gray-500">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 12 }} tickLine={{ stroke: "#e5e7eb" }} />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  tickLine={{ stroke: "#e5e7eb" }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    border: "1px solid #e5e7eb",
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()} €`, undefined]}
                  labelFormatter={(label) => `Mois: ${label}`}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingTop: "10px" }} />
                <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
                <Line
                  type="monotone"
                  dataKey="revenus"
                  name="Revenus prévus"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#0ea5e9", strokeWidth: 2, stroke: "white" }}
                  activeDot={{ r: 6, fill: "#0ea5e9", stroke: "white", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="depenses"
                  name="Dépenses prévues"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#ef4444", strokeWidth: 2, stroke: "white" }}
                  activeDot={{ r: 6, fill: "#ef4444", stroke: "white", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="resultatNet"
                  name="Résultat net prévu"
                  stroke="#10b981"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "white" }}
                  activeDot={{ r: 6, fill: "#10b981", stroke: "white", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div variants={fadeIn} className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-blue-700">Revenus prévus</h3>
                  <div className={`flex items-center ${revenueTrend >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {revenueTrend >= 0 ? (
                      <TrendingUp className="h-5 w-5 mr-1" />
                    ) : (
                      <TrendingDown className="h-5 w-5 mr-1" />
                    )}
                    <span className="font-medium">{Math.abs(revenueTrend).toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-blue-800">{totals.revenus.toLocaleString()} €</p>
                <div className="mt-4 text-sm text-blue-600">
                  <div className="flex items-center">
                    <ArrowRight className="h-4 w-4 mr-1" />
                    <span>Moyenne mensuelle: {(totals.revenus / 6).toLocaleString()} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-red-700">Dépenses prévues</h3>
                  <div className={`flex items-center ${expenseTrend <= 0 ? "text-green-600" : "text-red-600"}`}>
                    {expenseTrend >= 0 ? (
                      <TrendingUp className="h-5 w-5 mr-1" />
                    ) : (
                      <TrendingDown className="h-5 w-5 mr-1" />
                    )}
                    <span className="font-medium">{Math.abs(expenseTrend).toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-red-800">{totals.depenses.toLocaleString()} €</p>
                <div className="mt-4 text-sm text-red-600">
                  <div className="flex items-center">
                    <ArrowRight className="h-4 w-4 mr-1" />
                    <span>Moyenne mensuelle: {(totals.depenses / 6).toLocaleString()} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-green-700">Résultat net prévu</h3>
                  <div className={`flex items-center ${profitTrend >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {profitTrend >= 0 ? (
                      <TrendingUp className="h-5 w-5 mr-1" />
                    ) : (
                      <TrendingDown className="h-5 w-5 mr-1" />
                    )}
                    <span className="font-medium">{Math.abs(profitTrend).toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-800">{totals.resultatNet.toLocaleString()} €</p>
                <div className="mt-4 text-sm text-green-600">
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
              <Alert className="bg-red-50 border-red-200 text-red-800">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <AlertTitle className="text-lg font-semibold">Alerte de déficit prévu</AlertTitle>
                  <AlertDescription>
                    Les prévisions indiquent un déficit total de {Math.abs(totals.resultatNet).toLocaleString()} € sur
                    les 6 prochains mois. Nous vous recommandons de revoir votre stratégie budgétaire.
                  </AlertDescription>
                </div>
              </Alert>
            ) : (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <TrendingUp className="h-5 w-5 text-green-500" />
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
