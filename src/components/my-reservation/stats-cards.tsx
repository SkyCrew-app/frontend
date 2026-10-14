"use client"

import { useTranslation } from "react-i18next"
import { StatCard, type StatTone } from "@/components/layout/StatCard"
import { Calendar, CalendarClock, Clock, Wallet } from "lucide-react"
import type { Reservation } from "@/interfaces/reservation"
import { formatFlightDuration, formatMoney } from "@/lib/format"

interface StatsCardsProps {
  reservations: Reservation[]
}

const isCancelled = (reservation: Reservation) => String(reservation.status).toUpperCase() === "CANCELLED"

// A booking is confirmed as soon as it is made and removed when it is cancelled: the useful
// figures are what is coming, the hours booked and what they cost, not a status count.
export function StatsCards({ reservations }: StatsCardsProps) {
  const { t } = useTranslation("reservations")
  const now = Date.now()
  const active = reservations.filter((reservation) => !isCancelled(reservation))
  const upcoming = active.filter((reservation) => new Date(reservation.start_time).getTime() > now).length
  const bookedHours = active.reduce(
    (total, reservation) =>
      total + (new Date(reservation.end_time).getTime() - new Date(reservation.start_time).getTime()) / 3_600_000,
    0,
  )
  const paid = active.reduce((total, reservation) => total + Number(reservation.charged_amount ?? 0), 0)

  const stats = [
    { title: t("common:labels.total"), value: String(active.length), icon: Calendar, tone: "info" as StatTone },
    { title: t("my.stats.upcoming"), value: String(upcoming), icon: CalendarClock, tone: "success" as StatTone },
    { title: t("my.stats.bookedHours"), value: formatFlightDuration(bookedHours), icon: Clock, tone: "neutral" as StatTone },
    { title: t("my.stats.paid"), value: formatMoney(paid), icon: Wallet, tone: "brand" as StatTone },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} label={stat.title} value={stat.value} icon={stat.icon} tone={stat.tone} />
      ))}
    </div>
  )
}
