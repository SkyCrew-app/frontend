"use client"

import { StatCard, type StatTone } from "@/components/layout/StatCard"
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
      tone: "info" as StatTone,
    },
    {
      title: "Confirmées",
      value: confirmedReservations,
      icon: CalendarCheck,
      tone: "success" as StatTone,
    },
    {
      title: "En attente",
      value: pendingReservations,
      icon: CalendarClock,
      tone: "warning" as StatTone,
    },
    {
      title: "Annulées",
      value: cancelledReservations,
      icon: CalendarX,
      tone: "danger" as StatTone,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} label={stat.title} value={stat.value} icon={stat.icon} tone={stat.tone} />
      ))}
    </div>
  )
}
