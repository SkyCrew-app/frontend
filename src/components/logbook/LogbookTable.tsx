"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ArrowDown, ArrowUp, ArrowUpDown, BookOpen } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/layout/EmptyState"
import { logbookRole } from "@/components/logbook/logbook-role"
import { ListPager } from "@/components/reservation/list-pager"
import { flightTypeLabel } from "@/components/flight/flight-type"
import { formatDate, formatFlightDuration } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Flight } from "@/interfaces/flight"

interface LogbookTableProps {
  flights: Flight[]
  loading: boolean
  /** True when filters are applied, to word the empty state accordingly. */
  filtered?: boolean
  onResetFilters?: () => void
}

type SortKey = "date" | "registration" | "flight_type" | "origin" | "destination" | "hours"
type SortDirection = "asc" | "desc"

const PAGE_SIZE = 20

const dateOf = (flight: Flight) => flight.departure_time ?? flight.reservation?.start_time

const sortValue = (flight: Flight, key: SortKey): string | number => {
  switch (key) {
    case "date":
      return dateOf(flight) ?? ""
    case "registration":
      return flight.reservation?.aircraft?.registration_number ?? ""
    case "flight_type":
      return flightTypeLabel(flight.flight_type)
    case "origin":
      return flight.origin_icao
    case "destination":
      return flight.destination_icao
    case "hours":
      return flight.flight_hours
  }
}

export default function LogbookTable({ flights, loading, filtered = false, onResetFilters }: LogbookTableProps) {
  const router = useRouter()
  const { t } = useTranslation("flights")
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [currentPage, setCurrentPage] = useState(1)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
    setCurrentPage(1)
  }

  // Sort the whole logbook, then cut it into pages.
  const sortedFlights = useMemo(() => {
    const sorted = [...flights]
    sorted.sort((a, b) => {
      const valA = sortValue(a, sortKey)
      const valB = sortValue(b, sortKey)
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA
      }
      return sortDirection === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })
    return sorted
  }, [flights, sortKey, sortDirection])

  const pageCount = Math.max(1, Math.ceil(sortedFlights.length / PAGE_SIZE))
  const page = Math.min(currentPage, pageCount)
  const pageFlights = sortedFlights.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loading && flights.length === 0) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (flights.length === 0) {
    return filtered ? (
      <EmptyState
        icon={BookOpen}
        title={t("logbook.table.noMatch.title")}
        description={t("logbook.table.noMatch.description")}
        action={
          onResetFilters && (
            <Button variant="outline" onClick={onResetFilters}>
              {t("logbook.table.noMatch.reset")}
            </Button>
          )
        }
      />
    ) : (
      <EmptyState
        icon={BookOpen}
        title={t("logbook.table.empty.title")}
        description={t("logbook.table.empty.description")}
        action={
          <Button asChild>
            <Link href="/reservations/flight-plans">{t("logbook.table.empty.action")}</Link>
          </Button>
        }
      />
    )
  }

  const SortableHead = ({
    label,
    column,
    align,
    className,
  }: {
    label: string
    column: SortKey
    align?: "right"
    className?: string
  }) => {
    const active = sortKey === column
    const Icon = !active ? ArrowUpDown : sortDirection === "asc" ? ArrowUp : ArrowDown
    return (
      <TableHead
        aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
        className={cn(align === "right" && "text-right", className)}
      >
        <button
          type="button"
          onClick={() => handleSort(column)}
          className="inline-flex items-center gap-2 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {label}
          <Icon className={active ? "h-3.5 w-3.5 text-foreground" : "h-3.5 w-3.5 opacity-50"} aria-hidden="true" />
        </button>
      </TableHead>
    )
  }

  const openFlight = (flight: Flight) => router.push(`/reservations/flight-plans/${flight.id}`)

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label={t("common:labels.date")} column="date" />
              <SortableHead label={t("common:labels.aircraft")} column="registration" />
              <SortableHead label={t("logbook.table.departure")} column="origin" className="hidden sm:table-cell" />
              <SortableHead label={t("logbook.table.arrival")} column="destination" className="hidden sm:table-cell" />
              <SortableHead label={t("common:labels.duration")} column="hours" align="right" />
              <SortableHead label={t("logbook.table.flightType")} column="flight_type" className="hidden lg:table-cell" />
              <TableHead className="hidden lg:table-cell">{t("logbook.table.role")}</TableHead>
              <TableHead className="hidden xl:table-cell">{t("logbook.table.remarks")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageFlights.map((flight) => (
              <TableRow
                key={flight.id}
                tabIndex={0}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={() => openFlight(flight)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") openFlight(flight)
                }}
              >
                <TableCell className="tabular-nums sm:whitespace-nowrap">{formatDate(dateOf(flight))}</TableCell>
                <TableCell className="sm:whitespace-nowrap">
                  <span className="font-medium">{flight.reservation?.aircraft?.registration_number ?? "—"}</span>
                  {flight.reservation?.aircraft?.model && (
                    <span className="block text-xs text-muted-foreground">{flight.reservation.aircraft.model}</span>
                  )}
                </TableCell>
                <TableCell className="hidden font-mono sm:table-cell">{flight.origin_icao}</TableCell>
                <TableCell className="hidden font-mono sm:table-cell">{flight.destination_icao}</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatFlightDuration(flight.flight_hours)}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap lg:table-cell">{flightTypeLabel(flight.flight_type)}</TableCell>
                <TableCell className="hidden whitespace-nowrap lg:table-cell">
                  {(() => {
                    const role = logbookRole(flight)
                    if (!role) return "—"
                    return (
                      <>
                        <Badge variant={role.variant}>{role.label}</Badge>
                        {role.withWhom && <span className="block text-xs text-muted-foreground">{role.withWhom}</span>}
                      </>
                    )
                  })()}
                </TableCell>
                <TableCell className="hidden max-w-[240px] truncate text-muted-foreground xl:table-cell" title={flight.remarks ?? undefined}>
                  {flight.remarks || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ListPager
        page={page}
        pageCount={pageCount}
        onPageChange={setCurrentPage}
        total={sortedFlights.length}
        noun={[t("logbook.table.flightNoun.singular"), t("logbook.table.flightNoun.plural")]}
      />
    </div>
  )
}
