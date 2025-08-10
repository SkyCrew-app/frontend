import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"

interface StatCardProps {
  title: string
  value: number
  percentage: number
  icon: LucideIcon
  color: string
}

export function StatCard({ title, value, percentage, icon: Icon, color }: StatCardProps) {
  const t = useTranslations('fleet');
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Icon className={`h-5 w-5 mr-2 ${color}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-3xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{t('pourcentage', { percentage: percentage })}</div>
        </div>
        <div className="mt-2 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${color.includes("green") ? "bg-green-500" : color.includes("amber") ? "bg-amber-500" : "bg-blue-500"}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </CardContent>
    </Card>
  )
}
