"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown } from "lucide-react"
import type { Flight } from "@/interfaces/flight"

interface LogbookTableProps {
  flights: Flight[]
  loading: boolean
}

type SortKey = "date" | "registration" | "flight_type" | "origin" | "destination" | "hours"
type SortDirection = "asc" | "desc"

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`
}

export default function LogbookTable({ flights, loading }: LogbookTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const sortedFlights = useMemo(() => {
    const sorted = [...flights]
    sorted.sort((a, b) => {
      let valA: string | number = ""
      let valB: string | number = ""

      switch (sortKey) {
        case "date":
          valA = a.departure_time ?? a.reservation?.start_time ?? ""
          valB = b.departure_time ?? b.reservation?.start_time ?? ""
          break
        case "registration":
          valA = a.reservation?.aircraft?.registration_number ?? ""
          valB = b.reservation?.aircraft?.registration_number ?? ""
          break
        case "flight_type":
          valA = a.flight_type
          valB = b.flight_type
          break
        case "origin":
          valA = a.origin_icao
          valB = b.origin_icao
          break
        case "destination":
          valA = a.destination_icao
          valB = b.destination_icao
          break
        case "hours":
          valA = a.flight_hours
          valB = b.flight_hours
          break
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA
      }
      const strA = String(valA)
      const strB = String(valB)
      return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA)
    })
    return sorted
  }, [flights, sortKey, sortDirection])

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (flights.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Aucun vol enregistré
      </div>
    )
  }

  const SortableHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => handleSort(sortKeyName)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </div>
    </TableHead>
  )

  return (
    <div className="overflow-x-auto rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader label="Date" sortKeyName="date" />
            <SortableHeader label="Immatriculation" sortKeyName="registration" />
            <TableHead>Type</TableHead>
            <SortableHeader label="Départ" sortKeyName="origin" />
            <SortableHeader label="Arrivée" sortKeyName="destination" />
            <SortableHeader label="Durée" sortKeyName="hours" />
            <SortableHeader label="Nature" sortKeyName="flight_type" />
            <TableHead>Remarques</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedFlights.map((flight) => (
            <TableRow key={flight.id}>
              <TableCell className="whitespace-nowrap">
                {formatDate(flight.departure_time ?? flight.reservation?.start_time)}
              </TableCell>
              <TableCell className="font-medium">
                {flight.reservation?.aircraft?.registration_number ?? "-"}
              </TableCell>
              <TableCell>
                {flight.reservation?.aircraft?.model ?? "-"}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{flight.origin_icao}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{flight.destination_icao}</Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatHours(flight.flight_hours)}</TableCell>
              <TableCell>
                <Badge variant="secondary">{flight.flight_type}</Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                {flight.remarks ?? "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
