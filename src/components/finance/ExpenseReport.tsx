"use client"

import { useQuery } from "@apollo/client"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Loader2, Receipt, ArrowDown, ArrowUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { GET_EXPENSES } from "@/graphql/finance"
import type { Expense, ExpenseChartDataItem } from "@/interfaces/finance"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    payload: ExpenseChartDataItem
  }>
}

interface CustomLabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  name: string
  value: number
  total: number
}

const COLORS = [
  "#0ea5e9", // Blue
  "#10b981", // Green
  "#f59e0b", // Yellow
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#6366f1", // Indigo
]

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

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0]
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border">
        <p className="font-medium text-gray-900">{data.name}</p>
        <p className="text-gray-600">{`${data.value.toLocaleString()} €`}</p>
        <p className="text-sm text-gray-500">{`${((data.value / data.payload.total) * 100).toFixed(1)}%`}</p>
      </div>
    )
  }
  return null
}

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value, total }: CustomLabelProps) => {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const percentage = ((value / total) * 100).toFixed(1)

  const shortName = window.innerWidth < 768 ? (name.length > 10 ? `${name.substring(0, 10)}...` : name) : name

  return (
    <g>
      <text
        x={x}
        y={y}
        fill="#374151"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-[10px] sm:text-xs lg:text-sm font-medium"
      >
        {`${shortName}`}
      </text>
      <text
        x={x}
        y={y + 14}
        fill="#6B7280"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-[9px] sm:text-[11px] lg:text-xs"
      >
        {`(${percentage}%)`}
      </text>
    </g>
  )
}

export default function ExpensesReport({ period, date }: { period: string; date: Date | undefined }) {
  const safeDate = date ?? new Date()
  const startDate =
    period === "monthly"
      ? new Date(safeDate.getFullYear(), safeDate.getMonth(), 1)
      : new Date(safeDate.getFullYear(), 0, 1)
  const endDate =
    period === "monthly"
      ? new Date(safeDate.getFullYear(), safeDate.getMonth() + 1, 0)
      : new Date(safeDate.getFullYear(), 11, 31)

  const { loading, error, data } = useQuery(GET_EXPENSES, {
    variables: { startDate, endDate },
  })

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-muted-foreground animate-pulse">Analyse des dépenses en cours...</p>
        </div>
      </div>
    )

  if (error)
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl">
        <AlertTriangle className="h-5 w-5" />
        <div>
          <AlertTitle className="text-lg font-semibold">Erreur de chargement</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </div>
      </Alert>
    )

  const expenses = data?.expenseByPeriod || []
  const totalExpenses = expenses.reduce((acc: number, curr: Expense) => acc + curr.amount, 0)
  const budget = 100000
  const isOverBudget = totalExpenses > budget
  const budgetPercentage = (totalExpenses / budget) * 100

  const chartData: ExpenseChartDataItem[] = expenses.reduce((acc: ExpenseChartDataItem[], expense: Expense) => {
    const existingCategory = acc.find((item) => item.name === expense.category)
    if (existingCategory) {
      existingCategory.value += expense.amount
    } else {
      acc.push({
        name: expense.category,
        value: expense.amount,
        total: totalExpenses,
      })
    }
    return acc
  }, [])

  // Trier les données par valeur décroissante
  chartData.sort((a, b) => b.value - a.value)

  // Fonction pour obtenir une icône par catégorie
  const getCategoryIcon = (category: string) => {
    return <Receipt className="h-4 w-4" />
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-8 max-w-7xl mx-auto">
      {isOverBudget && (
        <motion.div variants={fadeIn}>
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <AlertTitle className="text-lg font-semibold">Alerte Dépassement de Budget</AlertTitle>
              <AlertDescription>
                Les dépenses totales ({totalExpenses.toLocaleString()} €) dépassent le budget{" "}
                {period === "monthly" ? "mensuel" : "annuel"} ({budget.toLocaleString()} €).
                <div className="mt-2 w-full bg-red-200 rounded-full h-2.5">
                  <div
                    className="bg-red-600 h-2.5 rounded-full"
                    style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                  ></div>
                </div>
                <div className="mt-1 text-sm flex justify-between">
                  <span>0 €</span>
                  <span>{budget.toLocaleString()} €</span>
                </div>
              </AlertDescription>
            </div>
          </Alert>
        </motion.div>
      )}

      <motion.div variants={fadeIn}>
        <Card className="shadow-lg border-t-4 border-t-purple-500">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-t-lg">
            <CardTitle className="text-xl font-bold text-purple-700 flex items-center">
              <Receipt className="mr-2 h-5 w-5 text-purple-500" />
              Répartition des Dépenses {period === "monthly" ? "Mensuelles" : "Annuelles"}
            </CardTitle>
            <CardDescription className="text-sm text-gray-500">
              Période du {format(startDate, "PPP", { locale: fr })} au {format(endDate, "PPP", { locale: fr })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="relative">
                <div className="h-[400px] w-full">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="70%"
                        innerRadius="45%"
                        paddingAngle={2}
                        minAngle={3}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) => (
                          <CustomLabel
                            cx={cx}
                            cy={cy}
                            midAngle={midAngle}
                            innerRadius={innerRadius}
                            outerRadius={outerRadius}
                            name={name}
                            value={value}
                            total={totalExpenses}
                          />
                        )}
                      >
                        {chartData.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            className="hover:opacity-80 transition-opacity"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{
                          paddingLeft: "20px",
                        }}
                        formatter={(value) => <span className="text-xs sm:text-sm font-medium">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                  <div className="text-2xl font-bold text-gray-800">{totalExpenses.toLocaleString()} €</div>
                  <div className="text-sm text-gray-500">Total des dépenses</div>
                </div>
              </div>
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold whitespace-nowrap">Catégorie</TableHead>
                      <TableHead className="text-right font-bold whitespace-nowrap">Montant</TableHead>
                      <TableHead className="text-right font-bold whitespace-nowrap">Pourcentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chartData.map((item, index) => {
                      const percentage = (item.value / totalExpenses) * 100
                      return (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="capitalize whitespace-nowrap">{item.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap font-medium">
                            {item.value.toLocaleString()} €
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Badge
                              className={percentage > 25 ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}
                            >
                              {percentage.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow className="hover:bg-transparent border-t-2 bg-muted/20">
                      <TableCell className="font-bold text-lg whitespace-nowrap">Total</TableCell>
                      <TableCell className="text-right font-bold text-lg whitespace-nowrap">
                        {totalExpenses.toLocaleString()} €
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg whitespace-nowrap">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 pt-4">
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-blue-700">
                        Budget {period === "monthly" ? "Mensuel" : "Annuel"}
                      </h3>
                      <p className="text-2xl font-bold text-blue-800">{budget.toLocaleString()} €</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <ArrowDown className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={isOverBudget ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-sm font-medium ${isOverBudget ? "text-red-700" : "text-green-700"}`}>
                        {isOverBudget ? "Dépassement" : "Reste disponible"}
                      </h3>
                      <p className={`text-2xl font-bold ${isOverBudget ? "text-red-800" : "text-green-800"}`}>
                        {Math.abs(budget - totalExpenses).toLocaleString()} €
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${isOverBudget ? "bg-red-100" : "bg-green-100"}`}>
                      {isOverBudget ? (
                        <ArrowUp className="h-6 w-6 text-red-600" />
                      ) : (
                        <ArrowDown className="h-6 w-6 text-green-600" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  )
}
