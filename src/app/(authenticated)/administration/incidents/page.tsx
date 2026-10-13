"use client"

import { Suspense, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@apollo/client"
import { AlertTriangle, CheckCircle, CircleDot, Search, Wrench, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/layout/StatCard"
import { ErrorState } from "@/components/layout/ErrorState"
import { IncidentTable } from "@/components/incidents/incident-table"
import { IncidentDetailPanel } from "@/components/incidents/incident-detail-panel"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { GET_ALL_INCIDENTS } from "@/graphql/incident"
import {
  INCIDENT_LEVELS,
  INCIDENT_STATUS_KEYS,
  canFollowUpIncidents,
  incidentPersonName,
  incidentSeverity,
  incidentStatus,
  type Incident,
} from "@/lib/incident"

const ITEMS_PER_PAGE = 10

const header = (
  <PageHeader
    className="mb-0"
    title="Incidents"
    description="Suivez les incidents déclarés par les pilotes à la clôture de leurs vols."
  />
)

function ContentSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement des incidents">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-10 w-full sm:max-w-xl" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

function IncidentsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data, loading, error, refetch } = useQuery(GET_ALL_INCIDENTS, { notifyOnNetworkStatusChange: true })

  const userEmail = useCurrentUser()
  const canFollowUp = canFollowUpIncidents(useUserData(userEmail))

  // The administration home links to one incident: /administration/incidents?incident=12
  const linkedId = searchParams.get("incident")
  const [selectedId, setSelectedId] = useState<string | null>(linkedId)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterSeverity, setFilterSeverity] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterAircraft, setFilterAircraft] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)

  const incidents: Incident[] = data?.getAllIncidents ?? []

  // Every filter change brings the list back to its first page.
  const withFirstPage = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setCurrentPage(1)
  }

  const resetFilters = () => {
    setSearchTerm("")
    setFilterSeverity("all")
    setFilterStatus("all")
    setFilterAircraft("all")
    setCurrentPage(1)
  }

  const closeDetail = () => {
    setSelectedId(null)
    // Drop the parameter so that a reload does not reopen the panel.
    if (linkedId) router.replace(pathname, { scroll: false })
  }

  if (loading && !data) return <ContentSkeleton />
  if (error && !data) return <ErrorState onRetry={() => refetch().catch(() => undefined)} />

  // Aircraft offered by the filter: the ones of the listed incidents.
  const aircraftOptions: { value: string; label: string }[] = []
  for (const incident of incidents) {
    const value = String(incident.aircraft.id)
    if (aircraftOptions.some((option) => option.value === value)) continue
    aircraftOptions.push({ value, label: incident.aircraft.registration_number })
  }
  aircraftOptions.sort((a, b) => a.label.localeCompare(b.label, "fr"))

  const search = searchTerm.trim().toLowerCase()
  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      search === "" ||
      [incident.description, incident.aircraft.registration_number, incidentPersonName(incident.user)].some((text) =>
        (text ?? "").toLowerCase().includes(search),
      )
    return (
      matchesSearch &&
      (filterSeverity === "all" || incidentSeverity(incident.severity_level).level === filterSeverity) &&
      (filterStatus === "all" || incidentStatus(incident.status).key === filterStatus) &&
      (filterAircraft === "all" || String(incident.aircraft.id) === filterAircraft)
    )
  })

  const hasFilters = search !== "" || filterSeverity !== "all" || filterStatus !== "all" || filterAircraft !== "all"

  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / ITEMS_PER_PAGE))
  const page = Math.min(currentPage, totalPages)
  const currentIncidents = filteredIncidents.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const countByStatus = (key: string) => incidents.filter((incident) => incidentStatus(incident.status).key === key).length
  const severeUnresolved = incidents.filter(
    (incident) =>
      incidentSeverity(incident.severity_level).level === "high" && incidentStatus(incident.status).key !== "resolved",
  ).length

  // Read from the list, so the panel shows the refreshed incident after an action.
  // An unknown identifier in the address simply opens nothing.
  const shownIncident = selectedId ? (incidents.find((incident) => String(incident.id) === selectedId) ?? null) : null

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Ouverts" value={countByStatus("open")} icon={CircleDot} tone="warning" />
        <StatCard label="En cours" value={countByStatus("in_progress")} icon={Wrench} tone="info" />
        <StatCard label="Résolus" value={countByStatus("resolved")} icon={CheckCircle} tone="success" />
        <StatCard
          label="Gravité élevée"
          value={severeUnresolved}
          hint="Non résolus"
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Description, aéronef ou pilote"
            value={searchTerm}
            onChange={(event) => withFirstPage(setSearchTerm)(event.target.value)}
            className="pl-8"
            aria-label="Rechercher des incidents"
          />
        </div>

        <Select value={filterSeverity} onValueChange={withFirstPage(setFilterSeverity)}>
          <SelectTrigger className="w-full sm:w-[190px]" aria-label="Filtrer par gravité">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les gravités</SelectItem>
            {INCIDENT_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {incidentSeverity(level).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={withFirstPage(setFilterStatus)}>
          <SelectTrigger className="w-full sm:w-[170px]" aria-label="Filtrer par statut">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {INCIDENT_STATUS_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {incidentStatus(key).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {aircraftOptions.length > 0 && (
          <Select value={filterAircraft} onValueChange={withFirstPage(setFilterAircraft)}>
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filtrer par aéronef">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les aéronefs</SelectItem>
              {aircraftOptions.map((aircraft) => (
                <SelectItem key={aircraft.value} value={aircraft.value}>
                  {aircraft.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasFilters && (
          <Button variant="ghost" onClick={resetFilters}>
            <X className="h-4 w-4" aria-hidden="true" />
            Réinitialiser
          </Button>
        )}
      </div>

      <IncidentTable
        incidents={currentIncidents}
        currentPage={page}
        itemsPerPage={ITEMS_PER_PAGE}
        totalItems={filteredIncidents.length}
        onPageChange={setCurrentPage}
        onSelectIncident={(incident) => setSelectedId(String(incident.id))}
        hasFilters={hasFilters}
        onResetFilters={resetFilters}
      />

      <IncidentDetailPanel incident={shownIncident} onClose={closeDetail} canFollowUp={canFollowUp} />
    </>
  )
}

export default function IncidentsPage() {
  return (
    <div className="space-y-6">
      {header}
      {/* useSearchParams needs a Suspense boundary. */}
      <Suspense fallback={<ContentSkeleton />}>
        <IncidentsContent />
      </Suspense>
    </div>
  )
}
