"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCwIcon, PlusIcon } from "lucide-react"
import { GET_ALL_MAINTENANCES, CREATE_MAINTENANCE, UPDATE_MAINTENANCE, DELETE_MAINTENANCE } from "@/graphql/maintenance"
import { GET_USERS } from "@/graphql/user"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import type { Maintenance } from "@/interfaces/maintenance"
import { useToast } from "@/components/hooks/use-toast"
import { SearchFilter } from "@/components/maintenance/search-filter"
import { MaintenanceTabs } from "@/components/maintenance/maintenance-tabs"
import { MaintenanceTable } from "@/components/maintenance/maintenance-table"
import { MaintenanceDetailDialog } from "@/components/maintenance/maintenance-detail-dialog"
import { MaintenanceFormDialog } from "@/components/maintenance/maintenance-form-dialog"
import type { DateRange } from "react-day-picker"

enum MaintenanceType {
  INSPECTION = "Inspection",
  REPAIR = "Réparation",
  OVERHAUL = "Révision",
  SOFTWARE_UPDATE = "Mise à jour logicielle",
  CLEANING = "Nettoyage",
  OTHER = "Autre",
}

enum MaintenanceStatus {
  PLANNED = "Planifiée",
  IN_PROGRESS = "En cours",
  COMPLETED = "Terminée",
  CANCELLED = "Annulée",
}

export default function MaintenanceTablePage() {
  const { data, loading, error, refetch } = useQuery(GET_ALL_MAINTENANCES, {
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les maintenances. Veuillez réessayer plus tard.",
      })
    },
  })

  const [createMaintenance] = useMutation(CREATE_MAINTENANCE)
  const [updateMaintenance] = useMutation(UPDATE_MAINTENANCE)
  const [deleteMaintenance] = useMutation(DELETE_MAINTENANCE)

  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterTechnician, setFilterTechnician] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: undefined, to: undefined })
  const [activeTab, setActiveTab] = useState("all")
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [maintenanceToEdit, setMaintenanceToEdit] = useState<Maintenance | null>(null)

  const itemsPerPage = 10

  const { toast } = useToast()

  const { data: usersData } = useQuery(GET_USERS)
  const { data: aircraftsData } = useQuery(GET_AIRCRAFTS)

  const aircrafts = aircraftsData?.getAircrafts || []
  const technicians = usersData?.getUsers.filter((user: { role: { role_name: string } }) => user.role?.role_name === "TECHNICIAN") || []

  if (loading)
    return (
      <div className="w-full p-8 space-y-4" aria-busy="true" aria-label="Chargement des données de maintenance">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )

  if (error) {
    toast({
      variant: "destructive",
      title: "Erreur",
      description: "Impossible de charger les maintenances. Veuillez réessayer plus tard.",
    })
    return null
  }

  const maintenances: Maintenance[] = data?.getAllMaintenances || []

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleTypeFilterChange = (value: string) => {
    setFilterType(value)
    setCurrentPage(1)
  }

  const handleStatusFilterChange = (value: string) => {
    setFilterStatus(value)
    setCurrentPage(1)
  }

  const handleTechnicianFilterChange = (value: string) => {
    setFilterTechnician(value)
    setCurrentPage(1)
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
    setCurrentPage(1)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleRefresh = () => {
    refetch()
    toast({
      title: "Actualisation",
      description: "Les données ont été actualisées.",
    })
  }

  const handleSelectMaintenance = (maintenance: Maintenance) => {
    setSelectedMaintenance(maintenance)
    setIsDetailDialogOpen(true)
  }

  const handleCreateMaintenance = () => {
    setMaintenanceToEdit(null)
    setIsFormDialogOpen(true)
  }

  const handleEditMaintenance = (maintenance: Maintenance) => {
    setMaintenanceToEdit(maintenance)
    setIsFormDialogOpen(true)
  }

  const handleDeleteMaintenance = async (maintenanceId: string) => {
    try {
      await deleteMaintenance({
        variables: { id: maintenanceId },
        refetchQueries: [{ query: GET_ALL_MAINTENANCES }],
      })
      toast({
        title: "Maintenance supprimée",
        description: "La maintenance a été supprimée avec succès.",
      })
    } catch (error) {
      console.error("Erreur lors de la suppression:", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression de la maintenance.",
      })
    }
  }

  const handleSubmitMaintenanceForm = async (formData: any) => {
    try {
      if (formData.id) {
        await updateMaintenance({
          variables: {
            updateMaintenanceInput: {
              id: parseInt(formData.id, 10),
              aircraft_id: formData.aircraft_id,
              maintenance_type: formData.maintenance_type,
              status: formData.status,
              start_date: formData.start_date,
              end_date: formData.end_date,
              description: formData.description,
              maintenance_cost: Number.parseFloat(formData.maintenance_cost) || 0,
              technician_id: formData.technician_id ? parseInt(formData.technician_id, 10) : null,
            }
          },
          refetchQueries: [{ query: GET_ALL_MAINTENANCES }],
        })
      } else {
        await createMaintenance({
          variables: {
            input: {
              aircraft_id: formData.aircraft_id,
              maintenance_type: formData.maintenance_type,
              status: formData.status,
              start_date: formData.start_date,
              end_date: formData.end_date,
              description: formData.description,
              maintenance_cost: Number.parseFloat(formData.maintenance_cost) || 0,
              technician_id: formData.technician_id || null,
            },
          },
          refetchQueries: [{ query: GET_ALL_MAINTENANCES }],
        })
      }

      return Promise.resolve()
    } catch (error) {
      console.error("Erreur lors de la soumission:", error)
      return Promise.reject(error)
    }
  }

  const filteredMaintenances = maintenances.filter((maintenance) => {
    const matchesSearchTerm =
      maintenance.aircraft.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      maintenance.aircraft.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (maintenance.description && maintenance.description.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesType = filterType === "all" || maintenance.maintenance_type === filterType

    const matchesStatus = filterStatus === "all" || maintenance.status === filterStatus

    const matchesTechnician =
      filterTechnician === "all" ||
      (maintenance.technician ? maintenance.technician.email : "non_assigned") === filterTechnician

    const matchesDate =
      (!dateRange || !dateRange.from || new Date(maintenance.start_date) >= dateRange.from) &&
      (!dateRange || !dateRange.to || new Date(maintenance.start_date) <= dateRange.to)

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "upcoming" && maintenance.status === "PLANNED") ||
      (activeTab === "inProgress" && maintenance.status === "IN_PROGRESS") ||
      (activeTab === "completed" && maintenance.status === "COMPLETED")

    return matchesSearchTerm && matchesType && matchesStatus && matchesTechnician && matchesDate && matchesTab
  })

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentMaintenances = filteredMaintenances.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredMaintenances.length / itemsPerPage)

  // Obtenir les statistiques pour les badges des onglets
  const upcomingCount = maintenances.filter((m) => m.status === "PLANNED").length
  const inProgressCount = maintenances.filter((m) => m.status === "IN_PROGRESS").length
  const completedCount = maintenances.filter((m) => m.status === "COMPLETED").length

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Maintenances</h1>
          <p className="text-muted-foreground mt-1">Suivez et gérez les maintenances de votre flotte d'aéronefs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} aria-label="Actualiser les données">
            <RefreshCwIcon className="h-4 w-4 mr-2" aria-hidden="true" />
            Actualiser
          </Button>
          <Button size="sm" onClick={handleCreateMaintenance} aria-label="Créer une nouvelle maintenance">
            <PlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
            Nouvelle Maintenance
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Barre de recherche et filtres */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <SearchFilter
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            filterType={filterType}
            onFilterTypeChange={handleTypeFilterChange}
            filterStatus={filterStatus}
            onFilterStatusChange={handleStatusFilterChange}
            filterTechnician={filterTechnician}
            onFilterTechnicianChange={handleTechnicianFilterChange}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            maintenanceTypes={MaintenanceType}
            maintenanceStatuses={MaintenanceStatus}
            technicians={maintenances.map((m) => m.technician || { email: "non_assigned" })}
          />
        </div>

        {/* Onglets */}
        <MaintenanceTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          counts={{
            all: maintenances.length,
            upcoming: upcomingCount,
            inProgress: inProgressCount,
            completed: completedCount,
          }}
        >
          <MaintenanceTable
            maintenances={currentMaintenances}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredMaintenances.length}
            onPageChange={handlePageChange}
            onSelectMaintenance={handleSelectMaintenance}
            maintenanceTypes={MaintenanceType}
          />
        </MaintenanceTabs>
      </div>

      {/* Modales */}
      <MaintenanceDetailDialog
        maintenance={selectedMaintenance}
        maintenanceTypes={MaintenanceType}
        maintenanceStatuses={MaintenanceStatus}
        isOpen={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        onEdit={handleEditMaintenance}
        onDelete={handleDeleteMaintenance}
      />

      <MaintenanceFormDialog
        isOpen={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        maintenance={maintenanceToEdit}
        maintenanceTypes={MaintenanceType}
        maintenanceStatuses={MaintenanceStatus}
        aircrafts={aircrafts}
        technicians={technicians}
        onSubmit={handleSubmitMaintenanceForm}
      />
    </div>
  )
}
