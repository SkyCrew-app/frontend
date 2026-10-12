"use client"

import { useState } from "react"
import { useQuery } from "@apollo/client"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Calculator, Hash, Receipt, Tag } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/layout/StatCard"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { GET_EXPENSES } from "@/graphql/finance"
import { formatDate, formatMoney } from "@/lib/format"
import {
  CATEGORY_COLORS,
  FinanceTabSkeleton,
  StatGrid,
  chartTooltipStyle,
  expenseCategoryLabel,
  formatShare,
} from "./finance-shared"

interface ExpenseRow {
  id: string
  expense_date: string
  amount: number
  category: string
  description?: string | null
}

interface CategoryTotal {
  name: string
  value: number
}

const PAGE_SIZE = 20

export default function ExpensesReport({ period, date }: { period: string; date: Date | undefined }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const safeDate = date ?? new Date()
  const startDate =
    period === "monthly"
      ? new Date(safeDate.getFullYear(), safeDate.getMonth(), 1)
      : new Date(safeDate.getFullYear(), 0, 1)
  const endDate =
    period === "monthly"
      ? new Date(safeDate.getFullYear(), safeDate.getMonth() + 1, 0)
      : new Date(safeDate.getFullYear(), 11, 31)

  const { loading, error, data, refetch } = useQuery(GET_EXPENSES, {
    variables: { startDate, endDate },
    // An expense added from the page header must show up when coming back to this tab.
    fetchPolicy: "cache-and-network",
  })

  if (loading && !data) return <FinanceTabSkeleton />
  if (error && !data) return <ErrorState onRetry={() => refetch()} />

  const expenses: ExpenseRow[] = [...(data?.expenseByPeriod ?? [])].sort(
    (a: ExpenseRow, b: ExpenseRow) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime(),
  )
  const periodLabel = `Du ${formatDate(startDate)} au ${formatDate(endDate)}`

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Aucune dépense sur cette période"
        description={`${periodLabel}. Changez de période ou ajoutez une dépense.`}
      />
    )
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  const categories: CategoryTotal[] = []
  for (const expense of expenses) {
    const name = expenseCategoryLabel(expense.category)
    const existing = categories.find((item) => item.name === name)
    if (existing) existing.value += expense.amount
    else categories.push({ name, value: expense.amount })
  }
  categories.sort((a, b) => b.value - a.value)
  const topCategory = categories[0]

  const visibleExpenses = expenses.slice(0, visibleCount)

  return (
    <div className="space-y-6">
      <StatGrid>
        <StatCard label="Total des dépenses" value={formatMoney(totalExpenses)} icon={Receipt} tone="warning" />
        <StatCard label="Nombre de dépenses" value={expenses.length} icon={Hash} tone="neutral" />
        <StatCard
          label="Dépense moyenne"
          value={formatMoney(totalExpenses / expenses.length)}
          icon={Calculator}
          tone="info"
        />
        <StatCard
          label="Premier poste"
          value={topCategory.name}
          hint={`${formatMoney(topCategory.value)} · ${formatShare(topCategory.value, totalExpenses)}`}
          icon={Tag}
          tone="primary"
        />
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>Répartition par catégorie</CardTitle>
          <CardDescription>{periodLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid items-center gap-6 lg:grid-cols-2">
            <div className="relative h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="90%"
                    paddingAngle={2}
                    minAngle={3}
                    stroke="hsl(var(--card))"
                  >
                    {categories.map((category, index) => (
                      <Cell key={category.name} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                    formatter={(value: number) => `${formatMoney(value)} (${formatShare(value, totalExpenses)})`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-semibold tabular-nums">{formatMoney(totalExpenses)}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Part</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category, index) => (
                  <TableRow key={category.name}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                          aria-hidden="true"
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {formatMoney(category.value)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                      {formatShare(category.value, totalExpenses)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    {formatMoney(totalExpenses)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">100 %</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Détail des dépenses</CardTitle>
          <CardDescription>Les plus récentes en premier.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(expense.expense_date)}</TableCell>
                  <TableCell className="whitespace-nowrap">{expenseCategoryLabel(expense.category)}</TableCell>
                  <TableCell className="min-w-[12rem] text-muted-foreground">{expense.description || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">
                    {formatMoney(expense.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {expenses.length > visibleCount && (
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {visibleCount} dépenses affichées sur {expenses.length}
              </p>
              <Button variant="outline" size="sm" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                Afficher les suivantes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
