"use client"

import { useQuery } from "@apollo/client"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { GET_LOGBOOK_ENTRIES, GET_LOGBOOK_STATS } from "@/graphql/logbook"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import type { LogbookFilter, HoursEntry } from "@/interfaces/logbook"
import type { Flight } from "@/interfaces/flight"
import { PageHeader } from "@/components/layout/PageHeader"
import { ErrorState } from "@/components/layout/ErrorState"
import LogbookStats from "@/components/logbook/LogbookStats"
import LogbookFilters from "@/components/logbook/LogbookFilters"
import LogbookTable from "@/components/logbook/LogbookTable"
import ExportPDFButton from "@/components/logbook/ExportPDFButton"
import { FLIGHT_TYPES } from "@/components/flight/flight-type"

// Placeholder the API uses for flights without a type.
const UNKNOWN_TYPE = "Inconnu"

export default function LogbookPage() {
  const { t } = useTranslation("flights")
  const [filter, setFilter] = useState<LogbookFilter>({})
  // Types met in the logbook so far, kept when a filter narrows the statistics.
  const [knownTypes, setKnownTypes] = useState<string[]>(FLIGHT_TYPES)

  const graphqlFilter = useMemo(() => {
    const f: Record<string, unknown> = {}
    if (filter.startDate) f.startDate = filter.startDate
    if (filter.endDate) f.endDate = filter.endDate
    if (filter.aircraftId) f.aircraftId = filter.aircraftId
    if (filter.flightType) f.flightType = filter.flightType
    return Object.keys(f).length > 0 ? f : undefined
  }, [filter])

  const hasFilters = graphqlFilter !== undefined

  const {
    data: entriesData,
    loading: loadingEntries,
    error: entriesError,
    refetch: refetchEntries,
  } = useQuery(GET_LOGBOOK_ENTRIES, {
    variables: { filter: graphqlFilter },
    fetchPolicy: "cache-and-network",
  })

  const {
    data: statsData,
    loading: loadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useQuery(GET_LOGBOOK_STATS, {
    variables: { filter: graphqlFilter },
    fetchPolicy: "cache-and-network",
  })

  const { data: aircraftData } = useQuery(GET_AIRCRAFTS)

  const flights: Flight[] = entriesData?.logbookEntries ?? []

  useEffect(() => {
    const labels: string[] = (statsData?.logbookStats?.hoursByCategory ?? [])
      .map((entry: HoursEntry) => entry.label)
      .filter((label: string) => label && label !== UNKNOWN_TYPE)
    setKnownTypes((previous) => {
      const merged = Array.from(new Set([...previous, ...labels]))
      return merged.length === previous.length ? previous : merged
    })
  }, [statsData])

  const aircraftList = useMemo(() => {
    return (
      aircraftData?.getAircrafts?.map((a: { id: number; registration_number: string; model: string }) => ({
        id: a.id,
        registration_number: a.registration_number,
        model: a.model,
      })) ?? []
    )
  }, [aircraftData])

  const failed = Boolean(entriesError || statsError) && flights.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={t("logbook.title")}
        description={t("logbook.description")}
        actions={<ExportPDFButton filter={filter} disabled={flights.length === 0} />}
      />

      {failed ? (
        <ErrorState
          onRetry={() => {
            void refetchEntries()
            void refetchStats()
          }}
        />
      ) : (
        <>
          <LogbookStats stats={statsData?.logbookStats} loading={loadingStats} />

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">{t("logbook.flightsHeading")}</h2>
            <LogbookFilters
              filter={filter}
              onFilterChange={setFilter}
              aircraftList={aircraftList}
              flightTypes={knownTypes}
            />
            {/* Remounted on each filter change so the table goes back to its first page. */}
            <LogbookTable
              key={JSON.stringify(graphqlFilter ?? {})}
              flights={flights}
              loading={loadingEntries}
              filtered={hasFilters}
              onResetFilters={() => setFilter({})}
            />
          </section>
        </>
      )}
    </div>
  )
}
