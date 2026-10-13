"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useQuery } from "@apollo/client"
import { AlertTriangle, Calendar, CalendarClock, ChevronRight, Clock, Plane, Users, Wrench } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/layout/StatCard"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import {
  GET_ADMIN_DASHBOARD_STATS,
  GET_RECENT_RESERVATIONS,
  GET_RECENT_FLIGHTS,
  GET_RECENT_INCIDENTS,
} from "@/graphql/admin"
import { formatDate, formatDateTime, formatFlightDuration, formatTime } from "@/lib/format"
import { reservationStatus } from "@/lib/reservation-status"
import { incidentSeverity, incidentStatus } from "@/lib/incident"

const FLIGHT_CATEGORIES: Record<string, string> = {
  local: "Local",
  cross_country: "Voyage",
  instruction: "Instruction",
  tourism: "Tourisme",
  training: "Entraînement",
  maintenance: "Maintenance",
  private: "Privé",
  corporate: "Entreprise",
}

const flightCategoryLabel = (category: string | null | undefined) =>
  FLIGHT_CATEGORIES[(category ?? "").toLowerCase()] ?? "Autre"

// The date of a flight: when it was planned, else when it left, else when it was closed.
const flightDate = (flight: {
  reservation?: { start_time?: string | null } | null
  departure_time?: string | null
  closed_at?: string | null
}) => flight.reservation?.start_time ?? flight.departure_time ?? flight.closed_at

// "12 oct. 2026, 14:30 – 16:00" when both ends are on the same day.
const formatSlot = (start: string, end: string) => {
  const sameDay = new Date(start).toDateString() === new Date(end).toDateString()
  return sameDay
    ? `${formatDate(start)}, ${formatTime(start)} – ${formatTime(end)}`
    : `${formatDateTime(start)} – ${formatDateTime(end)}`
}

interface Distribution {
  name: string
  value: number
}

// A share-of-total list: readable without a legend and without a chart library.
function DistributionList({ items, unit }: { items: Distribution[]; unit: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const share = total > 0 ? Math.round((item.value / total) * 100) : 0
        return (
          <li key={item.name} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{item.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {item.value} {unit} · {share} %
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}

interface SectionProps {
  title: string
  description?: string
  /** Where the full list lives, when the app has one. */
  href?: string
  linkLabel?: string
  loading: boolean
  failed: boolean
  onRetry: () => void
  children: ReactNode
  className?: string
}

function Section({ title, description, href, linkLabel, loading, failed, onRetry, children, className }: SectionProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {href && (
          <Button variant="ghost" size="sm" className="shrink-0" asChild>
            <Link href={href}>
              {linkLabel ?? "Tout voir"}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>{failed ? <ErrorState onRetry={onRetry} /> : loading ? <ListSkeleton /> : children}</CardContent>
    </Card>
  )
}

interface AttentionItem {
  key: string
  icon: LucideIcon
  tone: string
  title: string
  description: string
  href?: string
}

export default function AdminHomePage() {
  const statsQuery = useQuery(GET_ADMIN_DASHBOARD_STATS)
  const reservationsQuery = useQuery(GET_RECENT_RESERVATIONS, { variables: { limit: 5 } })
  const flightsQuery = useQuery(GET_RECENT_FLIGHTS, { variables: { limit: 5 } })
  const incidentsQuery = useQuery(GET_RECENT_INCIDENTS, { variables: { limit: 5 } })

  const stats = statsQuery.data?.adminDashboardStats
  const statsLoading = statsQuery.loading && !stats
  const statsFailed = Boolean(statsQuery.error) && !stats

  const recentReservations: any[] = reservationsQuery.data?.recentReservations ?? []
  const recentFlights: any[] = flightsQuery.data?.recentFlights ?? []
  const recentIncidents: any[] = incidentsQuery.data?.recentIncidents ?? []

  const usersByRole: Distribution[] = (stats?.usersByRole ?? []).map((item: any) => ({
    name: item.role_name || "Sans rôle",
    value: item.count,
  }))

  const reservationsByCategory: Distribution[] = (stats?.reservationsByCategory ?? []).map((item: any) => ({
    name: flightCategoryLabel(item.flight_category),
    value: item.count,
  }))

  const pendingReservations: number = stats?.pendingReservations ?? 0
  const unavailableAircrafts = Math.max(0, (stats?.totalAircrafts ?? 0) - (stats?.availableAircrafts ?? 0))
  // A resolved incident no longer needs attention.
  const severeIncidents = recentIncidents.filter(
    (incident) =>
      incidentSeverity(incident.severity_level).level === "high" && incidentStatus(incident.status).key !== "resolved",
  )

  const attention: AttentionItem[] = []
  if (pendingReservations > 0) {
    attention.push({
      key: "reservations",
      icon: CalendarClock,
      tone: "bg-warning/15 text-warning",
      title:
        pendingReservations > 1
          ? `${pendingReservations} réservations en attente`
          : "1 réservation en attente",
      description: "À confirmer ou à refuser dans le planning.",
      href: "/reservations",
    })
  }
  if (unavailableAircrafts > 0) {
    attention.push({
      key: "aircrafts",
      icon: Wrench,
      tone: "bg-info/15 text-info",
      title: unavailableAircrafts > 1 ? `${unavailableAircrafts} avions indisponibles` : "1 avion indisponible",
      description: "En maintenance ou retirés du planning.",
      href: "/administration/planes",
    })
  }
  if (severeIncidents.length > 0) {
    attention.push({
      key: "incidents",
      icon: AlertTriangle,
      tone: "bg-destructive/15 text-destructive",
      title:
        severeIncidents.length > 1
          ? `${severeIncidents.length} incidents récents de gravité élevée`
          : "1 incident récent de gravité élevée",
      description: severeIncidents.map((incident) => incident.aircraft?.registration_number).filter(Boolean).join(", "),
      href: "/administration/incidents",
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Administration" description="L'activité du club en un coup d'œil." className="mb-0" />

      {statsFailed ? (
        <ErrorState onRetry={() => statsQuery.refetch()} />
      ) : statsLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Membres" value={stats?.totalUsers ?? 0} icon={Users} tone="primary" />
          <StatCard
            label="Avions"
            value={stats?.totalAircrafts ?? 0}
            hint={`${stats?.availableAircrafts ?? 0} disponible${(stats?.availableAircrafts ?? 0) > 1 ? "s" : ""}`}
            icon={Plane}
            tone="success"
          />
          <StatCard
            label="Réservations"
            value={stats?.totalReservations ?? 0}
            hint={`${pendingReservations} en attente`}
            icon={Calendar}
            tone="warning"
          />
          <StatCard
            label="Heures de vol ce mois-ci"
            value={formatFlightDuration(stats?.flightHoursThisMonth ?? 0)}
            icon={Clock}
            tone="info"
          />
        </div>
      )}

      {!statsFailed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">À traiter</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading || incidentsQuery.loading ? (
              <ListSkeleton rows={2} />
            ) : attention.length === 0 ? (
              <p className="text-sm text-muted-foreground">Rien à signaler pour le moment.</p>
            ) : (
              <ul className="divide-y">
                {attention.map((item) => {
                  const content = (
                    <>
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.tone}`}>
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        {item.description && (
                          <p className="truncate text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                      {item.href && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                    </>
                  )
                  return (
                    <li key={item.key}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/50"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 py-3">{content}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <h2 className="text-lg font-semibold">Activité récente</h2>

      <Section
        title="Dernières réservations"
        href="/reservations"
        linkLabel="Planning"
        loading={reservationsQuery.loading && recentReservations.length === 0}
        failed={Boolean(reservationsQuery.error) && recentReservations.length === 0}
        onRetry={() => reservationsQuery.refetch()}
      >
        {recentReservations.length === 0 ? (
          <EmptyState icon={Calendar} title="Aucune réservation récente" />
        ) : (
          <ul className="divide-y">
            {recentReservations.map((reservation) => {
              const status = reservationStatus(reservation.status)
              return (
                <li
                  key={reservation.id}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {reservation.user?.first_name} {reservation.user?.last_name}
                      <span className="font-normal text-muted-foreground">
                        {" · "}
                        {reservation.aircraft?.registration_number}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatSlot(reservation.start_time, reservation.end_time)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {reservation.flight_category && (
                      <Badge variant="outline">{flightCategoryLabel(reservation.flight_category)}</Badge>
                    )}
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section
          title="Derniers vols"
          loading={flightsQuery.loading && recentFlights.length === 0}
          failed={Boolean(flightsQuery.error) && recentFlights.length === 0}
          onRetry={() => flightsQuery.refetch()}
        >
          {recentFlights.length === 0 ? (
            <EmptyState icon={Plane} title="Aucun vol récent" />
          ) : (
            <ul className="divide-y">
              {recentFlights.map((flight) => (
                <li key={flight.id} className="first:[&>a]:pt-0 last:[&>a]:pb-0">
                  <Link
                    href={`/reservations/flight-plans/${flight.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-primary"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {flight.origin_icao} → {flight.destination_icao}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {formatDate(flightDate(flight))}
                        {" · "}
                        {flight.user?.first_name} {flight.user?.last_name}
                        {flight.flight_type ? ` · ${flight.flight_type}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatFlightDuration(flight.flight_hours)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Derniers incidents"
          href="/administration/incidents"
          loading={incidentsQuery.loading && recentIncidents.length === 0}
          failed={Boolean(incidentsQuery.error) && recentIncidents.length === 0}
          onRetry={() => incidentsQuery.refetch()}
        >
          {recentIncidents.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="Aucun incident récent" />
          ) : (
            <ul className="divide-y">
              {recentIncidents.map((incident) => {
                const severity = incidentSeverity(incident.severity_level)
                const status = incidentStatus(incident.status)
                return (
                  <li key={incident.id} className="first:[&>a]:pt-0 last:[&>a]:pb-0">
                    <Link
                      href={`/administration/incidents?incident=${incident.id}`}
                      className="group block space-y-1 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <p className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                          {incident.aircraft?.registration_number}
                          <span className="font-normal text-muted-foreground">
                            {" · "}
                            {formatDate(incident.incident_date)}
                          </span>
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant={severity.variant}>Gravité {severity.label.toLowerCase()}</Badge>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{incident.description}</p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>
      </div>

      {!statsFailed && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Section
            title="Membres par rôle"
            href="/administration/users"
            linkLabel="Membres"
            loading={statsLoading}
            failed={false}
            onRetry={() => statsQuery.refetch()}
          >
            {usersByRole.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun membre pour le moment.</p>
            ) : (
              <DistributionList items={usersByRole} unit="" />
            )}
          </Section>

          <Section
            title="Réservations par type de vol"
            loading={statsLoading}
            failed={false}
            onRetry={() => statsQuery.refetch()}
          >
            {reservationsByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune réservation pour le moment.</p>
            ) : (
              <DistributionList items={reservationsByCategory} unit="" />
            )}
          </Section>
        </div>
      )}
    </div>
  )
}
