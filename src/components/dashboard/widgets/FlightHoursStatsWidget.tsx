"use client"

import { useMemo } from "react"
import { useQuery } from "@apollo/client"
import { GET_USER_FLIGHT_PLANS } from "@/graphql/flights"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { format, parseISO, startOfMonth } from "date-fns"
import { fr } from "date-fns/locale"

interface FlightHoursStatsWidgetProps {
  userId: number | null
}

export default function FlightHoursStatsWidget({ userId }: FlightHoursStatsWidgetProps) {
  const { data, loading } = useQuery(GET_USER_FLIGHT_PLANS, {
    variables: { userId: userId ? Number(userId) : 0 },
    skip: !userId,
  })

  const { chartData, totalHours } = useMemo(() => {
    const flights = data?.getFlightsByUser || []
    let total = 0
    const monthMap: Record<string, number> = {}

    flights.forEach((flight: any) => {
      const hours = flight.flight_hours || 0
      total += hours

      const date = flight.reservation?.start_time
      if (date) {
        const monthKey = format(startOfMonth(parseISO(date)), "yyyy-MM")
        monthMap[monthKey] = (monthMap[monthKey] || 0) + hours
      }
    })

    const sortedMonths = Object.keys(monthMap).sort()
    const last6 = sortedMonths.slice(-6)

    const chart = last6.map((key) => ({
      month: format(parseISO(`${key}-01`), "MMM yy", { locale: fr }),
      heures: Math.round(monthMap[key] * 10) / 10,
    }))

    return { chartData: chart, totalHours: Math.round(total * 10) / 10 }
  }, [data])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (totalHours === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Clock className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">Aucune heure de vol enregistrée</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-blue-500" />
        <span className="text-2xl font-bold">{totalHours}h</span>
        <span className="text-sm text-muted-foreground">au total</span>
      </div>

      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} width={30} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value}h`, "Heures"]}
            />
            <Bar dataKey="heures" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
