"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-950",
    },
    {
      title: "Heures de vol",
      value: totalHours.toFixed(1),
      unit: "h",
      icon: Clock,
      color: "text-green-500",
      bgColor: "bg-green-100 dark:bg-green-950",
    },
    {
      title: "Distance totale",
      value: Math.round(totalDistance),
      unit: "km",
      icon: Route,
      color: "text-amber-500",
      bgColor: "bg-amber-100 dark:bg-amber-950",
    },
    {
      title: "Aéroports visités",
      value: uniqueAirports.size,
      unit: "",
      icon: MapPin,
      color: "text-purple-500",
      bgColor: "bg-purple-100 dark:bg-purple-950",
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
              <span className="text-2xl font-bold">
                {stat.value}
                {stat.unit}
              </span>
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
