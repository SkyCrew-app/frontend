import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: number
  percentage: number
  icon: LucideIcon
  tone: "success" | "warning" | "info"
}

const TONES = {
  success: { text: "text-success", bar: "bg-success" },
  warning: { text: "text-warning", bar: "bg-warning" },
  info: { text: "text-info", bar: "bg-info" },
}

export function StatCard({ title, value, percentage, icon: Icon, tone }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
          <Icon className={`h-5 w-5 mr-2 ${TONES[tone].text}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
          <div className="text-sm text-muted-foreground">{percentage}% de la flotte</div>
        </div>
        <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${TONES[tone].bar}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </CardContent>
    </Card>
  )
}
