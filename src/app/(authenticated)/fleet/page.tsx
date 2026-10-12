"use client"

import { useThemeColors } from "@/components/hooks/useThemeColors"
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

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

export default function FleetDashboard() {
  const { data, loading, refetch } = useQuery<AircraftData>(GET_AIRCRAFTS, {
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les données des avions.",
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

  const themeColors = useThemeColors()

  const availabilityChartData = {
    labels: ["Disponible", "En maintenance", "Réservé"],
    datasets: [
      {
        data: [availableCount, maintenanceCount, reservedCount],
        backgroundColor: themeColors ? [themeColors.success, themeColors.warning, themeColors.info] : undefined,
        borderWidth: 0,
      },
    ],
  }

  const maintenanceChartData = {
    labels: ["Inspection", "Réparation", "Révision", "Mise à jour", "Nettoyage", "Autre"],
    datasets: [
      {
        label: "Nombre d'avions",
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
        backgroundColor: themeColors
          ? [
              themeColors["chart-2"],
              themeColors["chart-3"],
              themeColors["chart-4"],
              themeColors["chart-5"],
              themeColors["chart-6"],
              themeColors["chart-1"],
            ]
          : undefined,
        borderRadius: 4,
        borderWidth: 0,
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
      title: "Actualisation",
      description: "Les données ont été actualisées.",
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Flotte</h1>
          <p className="text-muted-foreground mt-1">Gérez et surveillez l'état de votre flotte d'aéronefs</p>
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={handleRefresh} aria-label="Actualiser les données">
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Actualiser
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
          tone="success"
        />
        <StatCard
          title="En maintenance"
          value={maintenanceCount}
          percentage={maintenancePercentage}
          icon={Wrench}
          tone="warning"
        />
        <StatCard
          title="Réservés"
          value={reservedCount}
          percentage={reservedPercentage}
          icon={Calendar}
          tone="info"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Disponibilité des aéronefs</CardTitle>
            <CardDescription>Répartition de l'état actuel de la flotte</CardDescription>
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
                          labels: { color: themeColors?.["muted-foreground"], usePointStyle: true, boxHeight: 8 },
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
            <CardTitle>Types de maintenance</CardTitle>
            <CardDescription>Répartition des types de maintenance effectués</CardDescription>
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
                      x: {
                        grid: { display: false },
                        border: { color: themeColors?.border },
                        ticks: { color: themeColors?.["muted-foreground"] },
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: themeColors?.border },
                        border: { display: false },
                        ticks: {
                          precision: 0,
                          color: themeColors?.["muted-foreground"],
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
            <CardTitle>Liste des aéronefs</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
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
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value={AvailabilityStatus.AVAILABLE}>Disponible</SelectItem>
                  <SelectItem value={AvailabilityStatus.UNAVAILABLE}>En maintenance</SelectItem>
                  <SelectItem value={AvailabilityStatus.RESERVED}>Réservé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="all">
                Tous
                <Badge variant="secondary" className="ml-2">
                  {totalAircrafts}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="available">
                Disponibles
                <Badge variant="secondary" className="ml-2">
                  {availableCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="maintenance">
                En maintenance
                <Badge variant="secondary" className="ml-2">
                  {maintenanceCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="reserved">
                Réservés
                <Badge variant="secondary" className="ml-2">
                  {reservedCount}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">Immatriculation</TableHead>
                    <TableHead className="w-[15%]">Modèle</TableHead>
                    <TableHead className="w-[15%]">Disponibilité</TableHead>
                    <TableHead className="w-[15%]">Maintenance</TableHead>
                    <TableHead className="w-[15%]">Heures de vol</TableHead>
                    <TableHead className="w-[15%]">Coût horaire</TableHead>
                    <TableHead className="w-[10%] text-right">Actions</TableHead>
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
                            Détails
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <p>Aucun aéronef trouvé</p>
                          <p className="text-sm">Ajustez vos filtres ou ajoutez un nouvel aéronef</p>
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
