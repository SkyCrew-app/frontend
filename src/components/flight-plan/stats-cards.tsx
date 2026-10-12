"use client"

import { StatCard } from "@/components/layout/StatCard"
import { Plane, MapPin, Route, Clock } from "lucide-react"
import { formatDecimal, formatFlightDuration } from "@/lib/format"
import type { Flight } from "@/interfaces/flight"

interface StatsCardsProps {
  flights: Flight[]
}

export function StatsCards({ flights }: StatsCardsProps) {
  const totalDistance = flights.reduce((sum, flight) => sum + (flight.distance_km || 0), 0)
  const totalHours = flights.reduce((sum, flight) => sum + (flight.flight_hours || 0), 0)

  const aerodromes = new Set<string>()
  flights.forEach((flight) => {
    if (flight.origin_icao) aerodromes.add(flight.origin_icao)
    if (flight.destination_icao) aerodromes.add(flight.destination_icao)
  })

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Plans de vol" value={flights.length} icon={Plane} tone="info" />
      <StatCard label="Temps de vol prévu" value={formatFlightDuration(totalHours)} icon={Clock} tone="success" />
      <StatCard label="Distance totale" value={`${formatDecimal(totalDistance, 0)} km`} icon={Route} tone="warning" />
      <StatCard label="Aérodromes" value={aerodromes.size} icon={MapPin} tone="primary" />
    </div>
  )
}
