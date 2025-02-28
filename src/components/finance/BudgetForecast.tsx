"use client"

import { useQuery } from "@apollo/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { GET_BUDGET_FORECAST } from "@/graphql/finance"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Loader2 } from "lucide-react"
import { addMonths, format, startOfMonth, endOfMonth } from "date-fns"
import { fr } from "date-fns/locale"
import { useMemo } from "react"

interface BudgetForecast {
  revenueForecast: number
  expenseForecast: number
  netForecast: number
}

interface BudgetForecastResponse {
  generateBudgetForecast: BudgetForecast
}

interface ChartDataItem {
  month: string
  revenus: number
  depenses: number
  resultatNet: number
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Vérifier s'il y a des erreurs
  const errors = queryResults.filter((query) => query.error)
  if (errors.length > 0) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          {errors.map((query, index) => (
            <div key={index}>{query.error?.message}</div>
          ))}
        </AlertDescription>
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

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Prévisions Budgétaires</CardTitle>
        <CardDescription className="text-sm text-gray-500">
          Prévisions détaillées mois par mois sur les 6 prochains mois
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`} />
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString()} €`, undefined]}
                labelFormatter={(label) => `Mois: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenus"
                name="Revenus prévus"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="depenses"
                name="Dépenses prévues"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="resultatNet"
                name="Résultat net prévu"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm font-medium text-blue-600">Revenus prévus (total)</p>
            <p className="text-2xl font-bold text-blue-700">{totals.revenus.toLocaleString()} €</p>
          </div>
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm font-medium text-red-600">Dépenses prévues (total)</p>
            <p className="text-2xl font-bold text-red-700">{totals.depenses.toLocaleString()} €</p>
          </div>
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm font-medium text-green-600">Résultat net prévu (total)</p>
            <p className="text-2xl font-bold text-green-700">{totals.resultatNet.toLocaleString()} €</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
