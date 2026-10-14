"use client"

import type React from "react"

import { useState } from "react"
import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarClock, CheckCircle, ChevronRight, Plane, RefreshCw, Search, Wrench } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/layout/StatCard"
import { ErrorState } from "@/components/layout/ErrorState"
import { EmptyState } from "@/components/layout/EmptyState"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import { type Aircraft, type AircraftData, AvailabilityStatus } from "@/interfaces/aircraft"
import { useToast } from "@/components/hooks/use-toast"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { canManageFleet } from "@/lib/roles"
import { StatusBadge } from "@/components/fleet/status-badge"
import { ListPagination } from "@/components/fleet/list-pagination"
import { AircraftDetailDialog } from "@/components/fleet/aircraft-detail-dialog"
import { aircraftAvailability, offeredAvailabilities } from "@/lib/aircraft"
import { MAINTENANCE_TYPE_VALUES, maintenanceTypeLabel } from "@/lib/maintenance"
import { formatFlightDuration, formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"

const ITEMS_PER_PAGE = 8

// The availability chart uses the colours of the status badges.
const AVAILABILITY_COLORS: Record<string, string> = {
  [AvailabilityStatus.AVAILABLE]: "hsl(var(--success))",
  [AvailabilityStatus.RESERVED]: "hsl(var(--info))",
  [AvailabilityStatus.UNAVAILABLE]: "hsl(var(--destructive))",
}

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
  fontSize: 12,
}

const AXIS_TICK = { fontSize: 12, fill: "hsl(var(--muted-foreground))" }

export default function FleetDashboard() {
  const { t } = useTranslation("fleet")
  const { data, loading, error, refetch } = useQuery<AircraftData>(GET_AIRCRAFTS, {
    notifyOnNetworkStatusChange: true,
  })
  const { toast } = useToast()

  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")

  const aircrafts = data?.getAircrafts ?? []
  const viewer = useUserData(useCurrentUser())
  // The panel follows the list: a return to service shows at once.
  const shownAircraft = selectedAircraft
    ? (aircrafts.find((aircraft) => aircraft.id === selectedAircraft.id) ?? selectedAircraft)
    : null
  const totalAircrafts = aircrafts.length

  const countByStatus = (status: string) => aircrafts.filter((a) => a.availability_status === status).length
  const availableCount = countByStatus(AvailabilityStatus.AVAILABLE)
  const reservedCount = countByStatus(AvailabilityStatus.RESERVED)
  const unavailableCount = countByStatus(AvailabilityStatus.UNAVAILABLE)
  const shareOfFleet = (count: number) =>
    totalAircrafts
      ? t("overview.stats.shareOfFleet", { percent: Math.round((count / totalAircrafts) * 100) })
      : undefined

  const availabilities = offeredAvailabilities(aircrafts.map((aircraft) => aircraft.availability_status))
  const availabilityChartData = availabilities.map((status) => ({
    status,
    name: aircraftAvailability(status).label,
    value: countByStatus(status),
  }))

  const maintenanceChartData = MAINTENANCE_TYPE_VALUES.map((type) => ({
    name: maintenanceTypeLabel(type),
    value: aircrafts.reduce(
      (total, aircraft) => total + (aircraft.maintenances?.filter((m) => m.maintenance_type === type).length ?? 0),
      0,
    ),
  }))
  const hasMaintenances = maintenanceChartData.some((item) => item.value > 0)

  const search = searchTerm.trim().toLowerCase()
  const filteredAircrafts = aircrafts.filter((aircraft) => {
    const matchesSearch =
      aircraft.registration_number.toLowerCase().includes(search) || aircraft.model.toLowerCase().includes(search)
    const matchesStatus = filterStatus === "all" || aircraft.availability_status === filterStatus
    return matchesSearch && matchesStatus
  })
  const currentAircrafts = filteredAircrafts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const hasFilters = search !== "" || filterStatus !== "all"

  const handleAircraftClick = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft)
    setIsDetailModalOpen(true)
  }

  const handleRefresh = async () => {
    try {
      await refetch()
      toast({ title: t("shared.refreshed") })
    } catch {
      toast({
        variant: "destructive",
        title: t("shared.refreshFailed"),
        description: t("overview.refreshFailedDescription"),
      })
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleStatusFilterChange = (value: string) => {
    setFilterStatus(value)
    setCurrentPage(1)
  }

  const resetFilters = () => {
    setSearchTerm("")
    setFilterStatus("all")
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={t("overview.title")}
        description={t("overview.description")}
        actions={
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t("common:actions.refresh")}
          </Button>
        }
      />

      {error && !data ? (
        <ErrorState onRetry={() => refetch().catch(() => undefined)} />
      ) : (
        <>
          {loading && !data ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className={cn("grid grid-cols-2 gap-4", reservedCount > 0 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
              <StatCard label={t("shared.aircraftPlural")} value={totalAircrafts} icon={Plane} tone="primary" />
              <StatCard
                label={t("overview.stats.available")}
                value={availableCount}
                hint={shareOfFleet(availableCount)}
                icon={CheckCircle}
                tone="success"
              />
              {/* "Réservé" is never set by the application: only shown when an aircraft has it. */}
              {reservedCount > 0 && (
                <StatCard
                  label={t("overview.stats.reserved")}
                  value={reservedCount}
                  hint={shareOfFleet(reservedCount)}
                  icon={CalendarClock}
                  tone="info"
                />
              )}
              <StatCard
                label={t("overview.stats.unavailable")}
                value={unavailableCount}
                hint={shareOfFleet(unavailableCount)}
                icon={Wrench}
                tone="danger"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("shared.availability")}</CardTitle>
                <CardDescription>{t("overview.availabilityChart.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && !data ? (
                  <Skeleton className="h-56 w-full" />
                ) : totalAircrafts === 0 ? (
                  <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                    {t("overview.availabilityChart.empty")}
                  </p>
                ) : (
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
                    <div className="h-56 w-full sm:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={availabilityChartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="60%"
                            outerRadius="90%"
                            paddingAngle={2}
                            stroke="hsl(var(--card))"
                          >
                            {availabilityChartData.map((entry) => (
                              <Cell
                                key={entry.status}
                                fill={AVAILABILITY_COLORS[entry.status]}
                                aria-label={`${entry.name} : ${entry.value}`}
                              />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: "hsl(var(--foreground))" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="w-full space-y-2 text-sm sm:w-1/2">
                      {availabilityChartData.map((entry) => (
                        <li key={entry.status} className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: AVAILABILITY_COLORS[entry.status] }}
                              aria-hidden="true"
                            />
                            {entry.name}
                          </span>
                          <span className="font-medium tabular-nums">{entry.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("overview.maintenanceChart.title")}</CardTitle>
                <CardDescription>{t("overview.maintenanceChart.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && !data ? (
                  <Skeleton className="h-56 w-full" />
                ) : !hasMaintenances ? (
                  <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                    {t("overview.maintenanceChart.empty")}
                  </p>
                ) : (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={maintenanceChartData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={140}
                          tick={AXIS_TICK}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--muted))" }}
                          contentStyle={TOOLTIP_STYLE}
                          itemStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Bar
                          dataKey="value"
                          name={t("overview.maintenanceChart.series")}
                          fill="hsl(var(--chart-1))"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <section className="space-y-4" aria-labelledby="fleet-list-title">
            <h2 id="fleet-list-title" className="text-lg font-semibold">
              {t("shared.aircraftPlural")}
            </h2>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-xs">
                <Search
                  className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  placeholder={t("shared.searchPlaceholder")}
                  aria-label={t("shared.searchLabel")}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-8"
                />
              </div>
              <Select value={filterStatus} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-full sm:w-[220px]" aria-label={t("shared.filterByAvailability")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("shared.allAvailabilities")}</SelectItem>
                  {availabilities.map((status) => (
                    <SelectItem key={status} value={status}>
                      {aircraftAvailability(status).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("shared.registration")}</TableHead>
                    <TableHead>{t("shared.model")}</TableHead>
                    <TableHead>{t("shared.availability")}</TableHead>
                    <TableHead>{t("overview.table.maintenance")}</TableHead>
                    <TableHead className="text-right">{t("shared.flightHours")}</TableHead>
                    <TableHead className="text-right">{t("shared.hourlyCost")}</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">{t("common:actions.details")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && !data ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : currentAircrafts.length > 0 ? (
                    currentAircrafts.map((aircraft) => (
                      <TableRow
                        key={aircraft.id}
                        className="cursor-pointer"
                        onClick={() => handleAircraftClick(aircraft)}
                      >
                        <TableCell className="font-medium">{aircraft.registration_number}</TableCell>
                        <TableCell>{aircraft.model}</TableCell>
                        <TableCell>
                          <StatusBadge status={aircraft.availability_status} type="availability" />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={aircraft.maintenance_status} type="maintenance" />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatFlightDuration(aircraft.total_flight_hours)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(aircraft.hourly_cost)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleAircraftClick(aircraft)
                            }}
                            aria-label={t("overview.table.viewDetailsOf", {
                              registration: aircraft.registration_number,
                            })}
                            title={t("overview.table.viewDetails")}
                          >
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7} className="p-4">
                        {hasFilters ? (
                          <EmptyState
                            icon={Search}
                            title={t("shared.noMatchTitle")}
                            description={t("shared.noMatchDescription")}
                            action={
                              <Button variant="outline" onClick={resetFilters}>
                                {t("shared.resetFilters")}
                              </Button>
                            }
                            className="border-0"
                          />
                        ) : (
                          <EmptyState
                            icon={Plane}
                            title={t("shared.noAircraft")}
                            description={t("overview.emptyDescription")}
                            className="border-0"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>

            <ListPagination
              page={currentPage}
              pageSize={ITEMS_PER_PAGE}
              totalItems={filteredAircrafts.length}
              onPageChange={setCurrentPage}
              itemsLabel={t("pagination.items.aircraft", { count: filteredAircrafts.length })}
            />
          </section>
        </>
      )}

      <AircraftDetailDialog
        aircraft={shownAircraft}
        isOpen={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        canReturnToService={canManageFleet(viewer)}
      />
    </div>
  )
}
