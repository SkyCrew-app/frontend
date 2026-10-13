"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { endOfDay, startOfDay } from "date-fns"
import type { DateRange } from "react-day-picker"
import { CalendarClock, CheckCircle, Euro, Loader2, Plus, RefreshCw, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/layout/StatCard"
import { ErrorState } from "@/components/layout/ErrorState"
import { GET_ALL_MAINTENANCES, CREATE_MAINTENANCE, UPDATE_MAINTENANCE, DELETE_MAINTENANCE } from "@/graphql/maintenance"
import { GET_USERS } from "@/graphql/user"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import type { Maintenance } from "@/interfaces/maintenance"
import { useToast } from "@/components/hooks/use-toast"
import { SearchFilter, type TechnicianOption } from "@/components/maintenance/search-filter"
import { MaintenanceTable } from "@/components/maintenance/maintenance-table"
import { MaintenanceDetailDialog } from "@/components/maintenance/maintenance-detail-dialog"
import { MaintenanceFormDialog } from "@/components/maintenance/maintenance-form-dialog"
import {
  buildCreateMaintenanceVariables,
  buildUpdateMaintenanceVariables,
  maintenanceTechnicianLabel,
  maintenanceTypeLabel,
  type MaintenanceAttachments,
  type MaintenanceFormValues,
} from "@/lib/maintenance"
import { formatDate, formatMoney } from "@/lib/format"

const ITEMS_PER_PAGE = 10
// Role name as the API returns it.
const ROLE_TECHNICIAN = "Technicien"

const UNASSIGNED = "non_assigned"

export default function MaintenanceTablePage() {
  const { data, loading, error, refetch } = useQuery(GET_ALL_MAINTENANCES, { notifyOnNetworkStatusChange: true })

  const [createMaintenance] = useMutation(CREATE_MAINTENANCE)
  const [updateMaintenance] = useMutation(UPDATE_MAINTENANCE)
  const [deleteMaintenance, { loading: deleting }] = useMutation(DELETE_MAINTENANCE)

  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterTechnician, setFilterTechnician] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [maintenanceToEdit, setMaintenanceToEdit] = useState<Maintenance | null>(null)
  const [maintenanceToDelete, setMaintenanceToDelete] = useState<Maintenance | null>(null)

  const { toast } = useToast()

  const { data: usersData } = useQuery(GET_USERS)
  const { data: aircraftsData } = useQuery(GET_AIRCRAFTS)

  const aircrafts = aircraftsData?.getAircrafts || []
  const technicians =
    usersData?.getUsers.filter((user: { role: { role_name: string } }) => user.role?.role_name === ROLE_TECHNICIAN) || []

  const maintenances: Maintenance[] = data?.getAllMaintenances || []

  // Every filter change brings the list back to its first page.
  const withFirstPage =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setCurrentPage(1)
    }

  const resetFilters = () => {
    setSearchTerm("")
    setFilterType("all")
    setFilterStatus("all")
    setFilterTechnician("all")
    setDateRange(undefined)
    setCurrentPage(1)
  }

  const handleRefresh = async () => {
    try {
      await refetch()
      toast({ title: "Données actualisées" })
    } catch {
      toast({
        variant: "destructive",
        title: "Actualisation impossible",
        description: "Les maintenances n'ont pas pu être rechargées.",
      })
    }
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
    setIsDetailDialogOpen(false)
    setMaintenanceToEdit(maintenance)
    setIsFormDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!maintenanceToDelete) return
    try {
      await deleteMaintenance({
        variables: { id: Number.parseInt(String(maintenanceToDelete.id), 10) },
        refetchQueries: [{ query: GET_ALL_MAINTENANCES }],
        awaitRefetchQueries: true,
      })
      toast({
        title: "Maintenance supprimée",
        description: `La maintenance de ${maintenanceToDelete.aircraft.registration_number} a été supprimée.`,
      })
      setIsDetailDialogOpen(false)
      setMaintenanceToDelete(null)
    } catch {
      toast({
        variant: "destructive",
        title: "Suppression impossible",
        description: "La maintenance n'a pas pu être supprimée. Réessayez.",
      })
    }
  }

  // Rejects on failure: the form reports it and stays open.
  const handleSubmitMaintenanceForm = async (formData: MaintenanceFormValues & MaintenanceAttachments) => {
    if (formData.id) {
      const variables = buildUpdateMaintenanceVariables(formData)
      if (!variables) throw new Error("Identifiant de maintenance invalide.")

      await updateMaintenance({
        variables,
        refetchQueries: [{ query: GET_ALL_MAINTENANCES }],
      })
    } else {
      await createMaintenance({
        variables: buildCreateMaintenanceVariables(formData),
        refetchQueries: [{ query: GET_ALL_MAINTENANCES }],
      })
    }
  }

  // Technicians offered by the filter: the ones of the listed maintenances.
  const technicianOptions: TechnicianOption[] = []
  for (const maintenance of maintenances) {
    const value = maintenance.technician?.email ?? UNASSIGNED
    if (technicianOptions.some((option) => option.value === value)) continue
    technicianOptions.push({
      value,
      label: maintenance.technician ? maintenanceTechnicianLabel(maintenance.technician) : "Non assigné",
    })
  }
  technicianOptions.sort((a, b) =>
    a.value === UNASSIGNED ? 1 : b.value === UNASSIGNED ? -1 : a.label.localeCompare(b.label, "fr"),
  )

  const search = searchTerm.trim().toLowerCase()
  const from = dateRange?.from ? startOfDay(dateRange.from) : null
  const to = dateRange?.to ? endOfDay(dateRange.to) : null

  const filteredMaintenances = maintenances.filter((maintenance) => {
    const matchesSearchTerm =
      maintenance.aircraft.registration_number.toLowerCase().includes(search) ||
      maintenance.aircraft.model.toLowerCase().includes(search) ||
      (maintenance.description && maintenance.description.toLowerCase().includes(search))

    const matchesType = filterType === "all" || maintenance.maintenance_type === filterType
    const matchesStatus = filterStatus === "all" || maintenance.status === filterStatus
    const matchesTechnician =
      filterTechnician === "all" || (maintenance.technician?.email ?? UNASSIGNED) === filterTechnician

    // A maintenance is kept when it overlaps the chosen period.
    const matchesDate =
      (!from || new Date(maintenance.end_date) >= from) && (!to || new Date(maintenance.start_date) <= to)

    return matchesSearchTerm && matchesType && matchesStatus && matchesTechnician && matchesDate
  })

  const hasFilters =
    search !== "" ||
    filterType !== "all" ||
    filterStatus !== "all" ||
    filterTechnician !== "all" ||
    Boolean(dateRange?.from || dateRange?.to)

  const totalPages = Math.max(1, Math.ceil(filteredMaintenances.length / ITEMS_PER_PAGE))
  // A deletion can empty the last page.
  const page = Math.min(currentPage, totalPages)
  const currentMaintenances = filteredMaintenances.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const countByStatus = (status: string) => maintenances.filter((m) => m.status === status).length
  const totalCost = maintenances
    .filter((m) => m.status !== "CANCELLED")
    .reduce((total, m) => total + (Number(m.maintenance_cost) || 0), 0)

  // The detail view shows the refreshed maintenance after an edit.
  const shownMaintenance = selectedMaintenance
    ? (maintenances.find((m) => m.id === selectedMaintenance.id) ?? selectedMaintenance)
    : null

  const renderContent = () => {
    if (loading && !data) {
      return (
        <div className="space-y-6" aria-busy="true" aria-label="Chargement des données de maintenance">
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

    if (error && !data) {
      return <ErrorState onRetry={() => refetch().catch(() => undefined)} />
    }

    return (
      <>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Planifiées" value={countByStatus("PLANNED")} icon={CalendarClock} tone="info" />
          <StatCard label="En cours" value={countByStatus("IN_PROGRESS")} icon={Wrench} tone="warning" />
          <StatCard label="Terminées" value={countByStatus("COMPLETED")} icon={CheckCircle} tone="success" />
          <StatCard
            label="Coût total"
            value={formatMoney(totalCost)}
            hint="Hors maintenances annulées"
            icon={Euro}
            tone="neutral"
          />
        </div>

        <SearchFilter
          searchTerm={searchTerm}
          onSearchChange={withFirstPage(setSearchTerm)}
          filterType={filterType}
          onFilterTypeChange={withFirstPage(setFilterType)}
          filterStatus={filterStatus}
          onFilterStatusChange={withFirstPage(setFilterStatus)}
          filterTechnician={filterTechnician}
          onFilterTechnicianChange={withFirstPage(setFilterTechnician)}
          dateRange={dateRange}
          onDateRangeChange={withFirstPage(setDateRange)}
          technicians={technicianOptions}
          hasFilters={hasFilters}
          onReset={resetFilters}
        />

        <MaintenanceTable
          maintenances={currentMaintenances}
          currentPage={page}
          itemsPerPage={ITEMS_PER_PAGE}
          totalItems={filteredMaintenances.length}
          onPageChange={setCurrentPage}
          onSelectMaintenance={handleSelectMaintenance}
          onEditMaintenance={handleEditMaintenance}
          onDeleteMaintenance={setMaintenanceToDelete}
          hasFilters={hasFilters}
          onResetFilters={resetFilters}
          onCreateMaintenance={handleCreateMaintenance}
        />
      </>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title="Maintenances"
        description="Planifiez et suivez les interventions sur les aéronefs de la flotte."
        actions={
          <>
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Actualiser
            </Button>
            <Button onClick={handleCreateMaintenance}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nouvelle maintenance
            </Button>
          </>
        }
      />

      {renderContent()}

      <MaintenanceDetailDialog
        maintenance={shownMaintenance}
        isOpen={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        onEdit={handleEditMaintenance}
        onDelete={setMaintenanceToDelete}
      />

      <MaintenanceFormDialog
        isOpen={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        maintenance={maintenanceToEdit}
        aircrafts={aircrafts}
        technicians={technicians}
        onSubmit={handleSubmitMaintenanceForm}
      />

      <AlertDialog
        open={maintenanceToDelete !== null}
        onOpenChange={(open) => !open && !deleting && setMaintenanceToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette maintenance ?</AlertDialogTitle>
            <AlertDialogDescription>
              {maintenanceToDelete && (
                <>
                  La maintenance « {maintenanceTypeLabel(maintenanceToDelete.maintenance_type)} » de{" "}
                  {maintenanceToDelete.aircraft.registration_number} du {formatDate(maintenanceToDelete.start_date)} sera
                  définitivement supprimée, avec ses pièces jointes.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              // Stays open until the deletion is done.
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
