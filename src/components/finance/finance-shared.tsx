import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDecimal } from "@/lib/format"
import { cn } from "@/lib/utils"

// One colour per meaning, the same in every finance chart.
export const FINANCE_COLORS = {
  revenue: "hsl(var(--chart-1))",
  expense: "hsl(var(--chart-3))",
  result: "hsl(var(--chart-4))",
  fuel: "hsl(var(--chart-5))",
  maintenance: "hsl(var(--chart-6))",
} as const

export const CATEGORY_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
]

export const CHART_GRID = "hsl(var(--border))"
export const CHART_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 12 }
export const CHART_MARGIN = { top: 8, right: 16, left: 0, bottom: 0 }

export const chartTooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
}

const compactMoney = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
})

// Axis ticks: "1,5 k €" takes less room than the full amount.
export const formatAxisMoney = (value: number) => compactMoney.format(value)

// The categories an expense can be saved with, and their French label.
export const EXPENSE_CATEGORIES = [
  { value: "maintenance", label: "Maintenance" },
  { value: "carburant", label: "Carburant" },
  { value: "assurance", label: "Assurance" },
  { value: "salaires", label: "Salaires" },
  { value: "autres", label: "Autres" },
] as const

export const expenseCategoryLabel = (category: string | null | undefined): string => {
  if (!category) return "Sans catégorie"
  const known = EXPENSE_CATEGORIES.find((item) => item.value === category.toLowerCase())
  if (known) return known.label
  // A category the app does not know: show it as readable text, not as a code.
  const text = category.replace(/[_-]+/g, " ").trim().toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Change between two values in percent; null when it cannot be computed.
export const percentChange = (previous: number | undefined, current: number | undefined): number | null => {
  if (previous === undefined || current === undefined || previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

// "+12,5 %"
export const formatPercentChange = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) return "—"
  return `${value > 0 ? "+" : ""}${formatDecimal(value, 1)} %`
}

// "42,5 %"
export const formatShare = (value: number, total: number): string =>
  total > 0 ? `${formatDecimal((value / total) * 100, 1)} %` : "—"

// Money figures need the full width on a phone.
export const STAT_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"

export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(STAT_GRID, className)}>{children}</div>
}

/** Loading shape shared by the finance tabs: figures, then a chart, then a table. */
export function FinanceTabSkeleton({ stats = 4 }: { stats?: number }) {
  return (
    <div className="space-y-6" role="status" aria-label="Chargement des données">
      <StatGrid>
        {Array.from({ length: stats }, (_, index) => (
          <Skeleton key={index} className="h-[104px] rounded-xl" />
        ))}
      </StatGrid>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
