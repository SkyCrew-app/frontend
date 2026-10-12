import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type StatTone = "primary" | "info" | "success" | "warning" | "danger" | "brand" | "neutral"

const TONES: Record<StatTone, string> = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info/15 text-info",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
  brand: "bg-brand/15 text-brand",
  neutral: "bg-muted text-muted-foreground",
}

interface StatCardProps {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  tone?: StatTone
  className?: string
}

/** Carte de chiffre clé, identique sur toutes les pages. */
export function StatCard({ label, value, hint, icon: Icon, tone = "primary", className }: StatCardProps) {
  return (
    <Card className={cn("flex items-center justify-between gap-4 p-5", className)}>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
      {Icon && (
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
    </Card>
  )
}
