"use client"

import type React from "react"

import { useState } from "react"
import { useQuery } from "@apollo/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
} from "@/components/ui/pagination"
import { Doughnut, Bar } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from "chart.js"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import { type Aircraft, type AircraftData, AvailabilityStatus } from "@/interfaces/aircraft"
import { useToast } from "@/components/hooks/use-toast"
import { Wrench, Calendar, Clock, Search, Filter, RefreshCw, CheckCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/fleet/status-badge"
import { StatCard } from "@/components/fleet/stats-card"
import { AircraftDetailDialog } from "@/components/fleet/aircraft-detail-dialog"
import { useTranslations } from "next-intl"

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

export default function FleetDashboard() {
  const t = useTranslations('fleet');
  const { data, loading, error, refetch } = useQuery<AircraftData>(GET_AIRCRAFTS, {
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t('error'),
        description: t('errorFetchingAircrafts'),
      })
    },
  })

  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [activeTab, setActiveTab] = useState("all")

  const itemsPerPage = 8
  const { toast } = useToast()

  const filteredAircrafts =
    data?.getAircrafts.filter((aircraft) => {
      const matchesSearch =
        aircraft.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aircraft.model.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = filterStatus === "all" || aircraft.availability_status === filterStatus

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "available" && aircraft.availability_status === AvailabilityStatus.AVAILABLE) ||
        (activeTab === "maintenance" && aircraft.availability_status === AvailabilityStatus.UNAVAILABLE) ||
        (activeTab === "reserved" && aircraft.availability_status === AvailabilityStatus.RESERVED)

      return matchesSearch && matchesStatus && matchesTab
    }) || []

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentAircrafts = filteredAircrafts.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredAircrafts.length / itemsPerPage)

  const availableCount =
    data?.getAircrafts.filter((a) => a.availability_status === AvailabilityStatus.AVAILABLE).length || 0
  const maintenanceCount =
    data?.getAircrafts.filter((a) => a.availability_status === AvailabilityStatus.UNAVAILABLE).length || 0
  const reservedCount =
    data?.getAircrafts.filter((a) => a.availability_status === AvailabilityStatus.RESERVED).length || 0

  const totalAircrafts = data?.getAircrafts.length || 0
  const availablePercentage = totalAircrafts ? Math.round((availableCount / totalAircrafts) * 100) : 0
  const maintenancePercentage = totalAircrafts ? Math.round((maintenanceCount / totalAircrafts) * 100) : 0
  const reservedPercentage = totalAircrafts ? Math.round((reservedCount / totalAircrafts) * 100) : 0

  const availabilityChartData = {
    labels: [t('available'), t('maintenance'), t('reserved')],
    datasets: [
      {
        data: [availableCount, maintenanceCount, reservedCount],
        backgroundColor: ["#10b981", "#f59e0b", "#3b82f6"],
        hoverBackgroundColor: ["#34d399", "#fbbf24", "#60a5fa"],
        borderWidth: 0,
      },
    ],
  }

  const maintenanceChartData = {
    labels: [t('inspection'), t('fixing'), t('reviewing'), t('updating'), t('cleaning'), t('other')],
    datasets: [
      {
        label: t('numberOfAircrafts'),
        data: [
          data?.getAircrafts.filter((a) => a.maintenances?.some((m) => m.maintenance_type === "INSPECTION")).length ||
            0,
          data?.getAircrafts.filter((a) => a.maintenances?.some((m) => m.maintenance_type === "REPAIR")).length || 0,
          data?.getAircrafts.filter((a) => a.maintenances?.some((m) => m.maintenance_type === "OVERHAUL")).length || 0,
          data?.getAircrafts.filter((a) => a.maintenances?.some((m) => m.maintenance_type === "SOFTWARE_UPDATE"))
            .length || 0,
          data?.getAircrafts.filter((a) => a.maintenances?.some((m) => m.maintenance_type === "CLEANING")).length || 0,
          data?.getAircrafts.filter((a) => a.maintenances?.some((m) => m.maintenance_type === "OTHER")).length || 0,
        ],
        backgroundColor: [
          "rgba(255, 99, 132, 0.7)",
          "rgba(54, 162, 235, 0.7)",
          "rgba(255, 206, 86, 0.7)",
          "rgba(75, 192, 192, 0.7)",
          "rgba(153, 102, 255, 0.7)",
          "rgba(255, 159, 64, 0.7)",
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
          "rgba(255, 159, 64, 1)",
        ],
        borderWidth: 1,
      },
    ],
  }

  const handleAircraftClick = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft)
    setIsDetailModalOpen(true)
  }

  const handleRefresh = () => {
    refetch()
    toast({
      title: t('loading'),
      description: t('dataRefreshed'),
    })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleStatusFilterChange = (value: string) => {
    setFilterStatus(value)
    setCurrentPage(1)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setCurrentPage(1)
  }

  const renderPageNumbers = () => {
    const pageNumbers = []
    const startPage = Math.max(1, currentPage - 2)
    const endPage = Math.min(totalPages, currentPage + 2)

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => handlePageChange(i)}
            isActive={i === currentPage}
            aria-current={i === currentPage ? "page" : undefined}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      )
    }

    return pageNumbers
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard')}</h1>
          <p className="text-muted-foreground mt-1">{t('description')}</p>
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={handleRefresh} aria-label={t('dataRefreshed')}>
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('update')}
          </Button>
        </div>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Disponibles"
          value={availableCount}
          percentage={availablePercentage}
          icon={CheckCircle}
          color="text-green-500"
        />
        <StatCard
          title="En Maintenance"
          value={maintenanceCount}
          percentage={maintenancePercentage}
          icon={Wrench}
          color="text-amber-500"
        />
        <StatCard
          title="Réservés"
          value={reservedCount}
          percentage={reservedPercentage}
          icon={Calendar}
          color="text-blue-500"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('graphTitle')}</CardTitle>
            <CardDescription>{t('graphDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              {loading ? (
                <Skeleton className="w-[300px] h-[300px] rounded-full" />
              ) : (
                <div className="w-[300px]">
                  <Doughnut
                    data={availabilityChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          position: "bottom",
                        },
                      },
                      cutout: "65%",
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('maintenanceType')}</CardTitle>
            <CardDescription>{t('maintenanceTypeDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              {loading ? (
                <Skeleton className="w-full h-[300px]" />
              ) : (
                <Bar
                  data={maintenanceChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          precision: 0,
                        },
                      },
                    },
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des aéronefs */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>{t('aircraftList')}</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('search')}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-8 w-full sm:w-[200px]"
                />
              </div>
              <Select value={filterStatus} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('status')}</SelectItem>
                  <SelectItem value={AvailabilityStatus.AVAILABLE}>{t('available')}</SelectItem>
                  <SelectItem value={AvailabilityStatus.UNAVAILABLE}>{t('maintenance')}</SelectItem>
                  <SelectItem value={AvailabilityStatus.RESERVED}>{t('reserved')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="all">
                {t('all')}
                <Badge variant="secondary" className="ml-2">
                  {totalAircrafts}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="available">
                {t('available')}
                <Badge variant="secondary" className="ml-2">
                  {availableCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="maintenance">
                {t('maintenance')}
                <Badge variant="secondary" className="ml-2">
                  {maintenanceCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="reserved">
                {t('reserved')}
                <Badge variant="secondary" className="ml-2">
                  {reservedCount}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">{t('immatriculation')}</TableHead>
                    <TableHead className="w-[15%]">{t('model')}</TableHead>
                    <TableHead className="w-[15%]">{t('availability')}</TableHead>
                    <TableHead className="w-[15%]">{t('maintenance')}</TableHead>
                    <TableHead className="w-[15%]">{t('hoursAmount')}</TableHead>
                    <TableHead className="w-[15%]">{t('hoursCoast')}</TableHead>
                    <TableHead className="w-[10%] text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : currentAircrafts.length > 0 ? (
                    currentAircrafts.map((aircraft) => (
                      <TableRow key={aircraft.id}>
                        <TableCell className="font-medium">{aircraft.registration_number}</TableCell>
                        <TableCell>{aircraft.model}</TableCell>
                        <TableCell>
                          <StatusBadge status={aircraft.availability_status} type="availability" />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={aircraft.maintenance_status} type="maintenance" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                            {aircraft.total_flight_hours} h
                          </div>
                        </TableCell>
                        <TableCell>{aircraft.hourly_cost.toFixed(2)} €</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAircraftClick(aircraft)}
                            aria-label={`Voir les détails de ${aircraft.registration_number}`}
                          >
                            {t('details')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <p>{t('notFound')}</p>
                          <p className="text-sm">{t('adjustFilters')}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center mt-4">
                <Pagination>
                  <PaginationContent>
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} />
                      </PaginationItem>
                    )}

                    {renderPageNumbers()}

                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationNext onClick={() => handlePageChange(currentPage + 1)} />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de détails */}
      <AircraftDetailDialog
        aircraft={selectedAircraft}
        isOpen={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
      />
    </div>
  )
}
