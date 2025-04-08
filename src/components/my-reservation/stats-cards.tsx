"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarCheck, CalendarClock, CalendarX, Calendar } from "lucide-react"
import type { Reservation } from "@/interfaces/reservation"

interface StatsCardsProps {
  reservations: Reservation[]
}

export function StatsCards({ reservations }: StatsCardsProps) {
  const totalReservations = reservations.length
  const confirmedReservations = reservations.filter((r) => r.status === "CONFIRMED").length
  const pendingReservations = reservations.filter((r) => r.status === "PENDING").length
  const cancelledReservations = reservations.filter((r) => r.status === "CANCELLED").length

  const stats = [
    {
      title: "Total",
      value: totalReservations,
      icon: Calendar,
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-950",
    },
    {
      title: "Confirmées",
      value: confirmedReservations,
      icon: CalendarCheck,
      color: "text-green-500",
      bgColor: "bg-green-100 dark:bg-green-950",
    },
    {
      title: "En attente",
      value: pendingReservations,
      icon: CalendarClock,
      color: "text-amber-500",
      bgColor: "bg-amber-100 dark:bg-amber-950",
    },
    {
      title: "Annulées",
      value: cancelledReservations,
      icon: CalendarX,
      color: "text-red-500",
      bgColor: "bg-red-100 dark:bg-red-950",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stat.value}</span>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
