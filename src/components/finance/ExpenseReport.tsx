"use client"

import { useQuery } from "@apollo/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Loader2 } from 'lucide-react'
import { GET_EXPENSES } from "@/graphql/finance"

interface Expense {
  category: string
  amount: number
}

interface ChartDataItem {
  name: string
  value: number
  total: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    payload: ChartDataItem
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
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const percentage = ((value / total) * 100).toFixed(1);

  const shortName = window.innerWidth < 768 ?
    (name.length > 10 ? `${name.substring(0, 10)}...` : name) :
    name;

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
  );
};

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )

  if (error)
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )

  const expenses = data?.expenseByPeriod || []
  const totalExpenses = expenses.reduce((acc: number, curr: Expense) => acc + curr.amount, 0)
  const budget = 100000
  const isOverBudget = totalExpenses > budget

  const chartData: ChartDataItem[] = expenses.reduce((acc: ChartDataItem[], expense: Expense) => {
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      {isOverBudget && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <AlertTitle className="text-lg mb-1">Alerte Dépassement de Budget</AlertTitle>
            <AlertDescription className="text-sm">
              Les dépenses totales ({totalExpenses.toLocaleString()} €) dépassent le budget{" "}
              {period === "monthly" ? "mensuel" : "annuel"} ({budget.toLocaleString()} €).
            </AlertDescription>
          </div>
        </Alert>
      )}

      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold">
            Répartition des Dépenses {period === "monthly" ? "Mensuelles" : "Annuelles"}
          </CardTitle>
          <CardDescription className="text-sm text-gray-500">
            Période du {startDate.toLocaleDateString()} au {endDate.toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-4 lg:gap-8">
            <div className="relative">
              <div className="h-[300px] sm:h-[400px] lg:h-[500px] w-full">
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
                      layout="horizontal"
                      align="center"
                      verticalAlign="bottom"
                      wrapperStyle={{
                        paddingTop: "20px",
                      }}
                      formatter={(value) => <span className="text-xs sm:text-sm font-medium">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
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
                  {chartData.map((item, index) => (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="whitespace-nowrap">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">{item.value.toLocaleString()} €</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {((item.value / totalExpenses) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="hover:bg-transparent border-t-2">
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
      </Card>
    </div>
  )
}
