"use client"

import { useTranslation } from "react-i18next"
import { StatCard, type StatTone } from "@/components/layout/StatCard"
import { CalendarCheck, CalendarClock, CalendarX, Calendar } from "lucide-react"
import type { Reservation } from "@/interfaces/reservation"

interface StatsCardsProps {
  reservations: Reservation[]
}

export function StatsCards({ reservations }: StatsCardsProps) {
  const { t } = useTranslation("reservations")
  const totalReservations = reservations.length
  const confirmedReservations = reservations.filter((r) => r.status === "CONFIRMED").length
  const pendingReservations = reservations.filter((r) => r.status === "PENDING").length
  const cancelledReservations = reservations.filter((r) => r.status === "CANCELLED").length

  const stats = [
    {
      title: t("common:labels.total"),
      value: totalReservations,
      icon: Calendar,
      tone: "info" as StatTone,
    },
    {
      title: t("my.stats.confirmed"),
      value: confirmedReservations,
      icon: CalendarCheck,
      tone: "success" as StatTone,
    },
    {
      title: t("my.stats.pending"),
      value: pendingReservations,
      icon: CalendarClock,
      tone: "warning" as StatTone,
    },
    {
      title: t("my.stats.cancelled"),
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
