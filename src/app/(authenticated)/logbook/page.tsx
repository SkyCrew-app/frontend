"use client"

import { useQuery } from "@apollo/client"
import { useState, useMemo } from "react"
import { GET_LOGBOOK_ENTRIES, GET_LOGBOOK_STATS } from "@/graphql/logbook"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import type { LogbookFilter } from "@/interfaces/logbook"
import type { Flight } from "@/interfaces/flight"
import LogbookStats from "@/components/logbook/LogbookStats"
import LogbookFilters from "@/components/logbook/LogbookFilters"
import LogbookTable from "@/components/logbook/LogbookTable"
import ExportPDFButton from "@/components/logbook/ExportPDFButton"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react"

const PAGE_SIZE = 20

export default function LogbookPage() {
  const [filter, setFilter] = useState<LogbookFilter>({})
  const [currentPage, setCurrentPage] = useState(1)

  const graphqlFilter = useMemo(() => {
    const f: Record<string, unknown> = {}
    if (filter.startDate) f.startDate = filter.startDate
    if (filter.endDate) f.endDate = filter.endDate
    if (filter.aircraftId) f.aircraftId = filter.aircraftId
    if (filter.flightType) f.flightType = filter.flightType
    return Object.keys(f).length > 0 ? f : undefined
  }, [filter])

  const { data: entriesData, loading: loadingEntries } = useQuery(GET_LOGBOOK_ENTRIES, {
    variables: { filter: graphqlFilter },
    fetchPolicy: "cache-and-network",
  })

  const { data: statsData, loading: loadingStats } = useQuery(GET_LOGBOOK_STATS, {
    variables: { filter: graphqlFilter },
    fetchPolicy: "cache-and-network",
  })

  const { data: aircraftData } = useQuery(GET_AIRCRAFTS)

  const flights: Flight[] = entriesData?.logbookEntries ?? []
  const totalPages = Math.max(1, Math.ceil(flights.length / PAGE_SIZE))

  const paginatedFlights = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return flights.slice(start, start + PAGE_SIZE)
  }, [flights, currentPage])

  const handleFilterChange = (newFilter: LogbookFilter) => {
    setFilter(newFilter)
    setCurrentPage(1)
  }

  const aircraftList = useMemo(() => {
    return (
      aircraftData?.getAircrafts?.map((a: { id: number; registration_number: string; model: string }) => ({
        id: a.id,
        registration_number: a.registration_number,
        model: a.model,
      })) ?? []
    )
  }, [aircraftData])

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Carnet de vol</h1>
        </div>
        <ExportPDFButton filter={filter} />
      </div>

      {/* Stats */}
      <LogbookStats stats={statsData?.logbookStats} loading={loadingStats} />

      {/* Filters */}
      <LogbookFilters filter={filter} onFilterChange={handleFilterChange} aircraftList={aircraftList} />

      {/* Table */}
      <LogbookTable flights={paginatedFlights} loading={loadingEntries} />

      {/* Pagination */}
      {flights.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages} ({flights.length} vol{flights.length > 1 ? "s" : ""})
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Suivant
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
