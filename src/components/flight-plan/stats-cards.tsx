"use client"

import { StatCard, type StatTone } from "@/components/layout/StatCard"
import { Plane, MapPin, Route, Clock } from "lucide-react"
import type { Flight } from "@/interfaces/flight"

interface StatsCardsProps {
  flights: Flight[]
}

export function StatsCards({ flights }: StatsCardsProps) {
  const totalFlights = flights.length

  const totalDistance = flights.reduce((sum, flight) => {
    return sum + (flight.distance_km || 0)
  }, 0)

  const totalHours = flights.reduce((sum, flight) => {
    return sum + (flight.flight_hours || 0)
  }, 0)

  const uniqueAirports = new Set()
  flights.forEach((flight) => {
    if (flight.origin_icao) uniqueAirports.add(flight.origin_icao)
    if (flight.destination_icao) uniqueAirports.add(flight.destination_icao)
  })

  const stats = [
    {
      title: "Plans de vol",
      value: totalFlights,
      unit: "",
      icon: Plane,
      tone: "info" as StatTone,
    },
    {
      title: "Heures de vol",
      value: totalHours.toFixed(1),
      unit: "h",
      icon: Clock,
      tone: "success" as StatTone,
    },
    {
      title: "Distance totale",
      value: Math.round(totalDistance),
      unit: "km",
      icon: Route,
      tone: "warning" as StatTone,
    },
    {
      title: "Aéroports visités",
      value: uniqueAirports.size,
      unit: "",
      icon: MapPin,
      tone: "primary" as StatTone,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <StatCard key={stat.title} label={stat.title} value={`${stat.value}${stat.unit}`} icon={stat.icon} tone={stat.tone} />
      ))}
    </div>
  )
}
