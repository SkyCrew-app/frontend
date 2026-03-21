"use client"

import { useMutation, useQuery } from "@apollo/client"
import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/hooks/use-toast"
import {
  GET_USER_RESERVATIONS,
  UPDATE_RESERVATION,
  GET_MY_TEMPLATES,
  CREATE_RESERVATION_TEMPLATE,
  UPDATE_RESERVATION_TEMPLATE,
  DELETE_RESERVATION_TEMPLATE,
} from "@/graphql/reservation"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { ReservationCard } from "@/components/my-reservation/reservation-card"
import { ReservationFilters } from "@/components/my-reservation/reservation-filters"
import { ReservationEditDialog } from "@/components/my-reservation/reservation-edit-dialog"
import { EmptyState } from "@/components/my-reservation/empty-state"
import { StatsCards } from "@/components/my-reservation/stats-cards"
import { TemplateCard } from "@/components/my-reservation/template-card"
import { TemplateDialog } from "@/components/my-reservation/template-dialog"
import { AlertCircle, Plus, BookTemplate } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import type { ReservationTemplate } from "@/interfaces/reservation-template"

const flightCategoryMapping = {
  LOCAL: "Local",
  CROSS_COUNTRY: "Vol longue distance",
  INSTRUCTION: "Instruction",
  TOURISM: "Tourisme",
  TRAINING: "Entraînement",
  MAINTENANCE: "Maintenance",
  PRIVATE: "Privé",
  CORPORATE: "Affaires",
}

const flightCategoryReverseMapping = Object.fromEntries(
  Object.entries(flightCategoryMapping).map(([key, value]) => [value, key]),
)

export default function MyReservations() {
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<any | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ReservationTemplate | null>(null)
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const { data, loading, error, refetch } = useQuery(GET_USER_RESERVATIONS, {
    variables: { userId },
    skip: !userId,
  })

  const [updateReservation] = useMutation(UPDATE_RESERVATION)

  const { data: templatesData, refetch: refetchTemplates } = useQuery(GET_MY_TEMPLATES)
  const { data: aircraftData } = useQuery(GET_AIRCRAFTS)
  const [createTemplate, { loading: creatingTemplate }] = useMutation(CREATE_RESERVATION_TEMPLATE)
  const [updateTemplate, { loading: updatingTemplate }] = useMutation(UPDATE_RESERVATION_TEMPLATE)
  const [deleteTemplate] = useMutation(DELETE_RESERVATION_TEMPLATE)

  const resetFilters = () => {
    setSearchTerm("")
    setStatusFilter("ALL")
    setCategoryFilter("ALL")
    setCurrentPage(1)
  }

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "ALL" || categoryFilter !== "ALL"

  const filteredReservations =
    data?.userReservations
      ?.filter((reservation: any) => {
        const searchTermLower = searchTerm.toLowerCase()
        const purposeLower = (reservation.purpose || "").toLowerCase()
        const registrationLower = reservation.aircraft.registration_number.toLowerCase()

        return (
          (purposeLower.includes(searchTermLower) || registrationLower.includes(searchTermLower)) &&
          (statusFilter === "ALL" || reservation.status === statusFilter) &&
          (categoryFilter === "ALL" || reservation.flight_category === categoryFilter)
        )
      })
      .sort((a: any, b: any) => {
        if (sortOrder === "newest") {
          return new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        } else {
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        }
      }) || []

  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage)
  const paginatedReservations = filteredReservations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleEdit = (reservation: any) => {
    setSelectedReservation(reservation)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async (purpose: string, notes: string, flightCategory: string) => {
    if (!selectedReservation) return

    try {
      await updateReservation({
        variables: {
          input: {
            id: selectedReservation.id,
            purpose,
            notes,
            flight_category: flightCategory,
          },
        },
        refetchQueries: [{ query: GET_USER_RESERVATIONS, variables: { userId } }],
      })

      setIsEditDialogOpen(false)
      toast({
        title: "Réservation mise à jour",
        description: `La réservation pour l'avion ${selectedReservation.aircraft.registration_number} a été mise à jour.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur lors de la mise à jour",
        description: "Une erreur est survenue lors de la mise à jour de la réservation.",
      })
    }
  }

  const templates: ReservationTemplate[] = templatesData?.myReservationTemplates ?? []
  const aircraftList = aircraftData?.getAircrafts ?? []

  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    setIsTemplateDialogOpen(true)
  }

  const handleEditTemplate = (template: ReservationTemplate) => {
    setEditingTemplate(template)
    setIsTemplateDialogOpen(true)
  }

  const handleSaveTemplate = async (data: any) => {
    try {
      if (data.id) {
        await updateTemplate({
          variables: { input: data },
          refetchQueries: [{ query: GET_MY_TEMPLATES }],
        })
        toast({ title: "Mod\u00e8le mis \u00e0 jour" })
      } else {
        await createTemplate({
          variables: { input: data },
          refetchQueries: [{ query: GET_MY_TEMPLATES }],
        })
        toast({ title: "Mod\u00e8le cr\u00e9\u00e9" })
      }
      setIsTemplateDialogOpen(false)
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder le mod\u00e8le." })
    }
  }

  const handleDeleteTemplate = async (id: number) => {
    try {
      await deleteTemplate({
        variables: { id },
        refetchQueries: [{ query: GET_MY_TEMPLATES }],
      })
      toast({ title: "Mod\u00e8le supprim\u00e9" })
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer le mod\u00e8le." })
    }
  }

  const handleUseTemplate = (template: ReservationTemplate) => {
    // Navigate to reservation page with template data as query params
    const params = new URLSearchParams()
    if (template.aircraft?.id) params.set("aircraft_id", template.aircraft.id.toString())
    if (template.preferred_start_time) params.set("start_time", template.preferred_start_time)
    if (template.preferred_end_time) params.set("end_time", template.preferred_end_time)
    if (template.flight_category) params.set("flight_category", template.flight_category)
    if (template.purpose) params.set("purpose", template.purpose)
    if (template.notes) params.set("notes", template.notes)
    router.push(`/reservations?${params.toString()}`)
  }

  const renderPageNumbers = () => {
    const pageNumbers = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <PaginationItem key={i}>
          <PaginationLink onClick={() => setCurrentPage(i)} isActive={i === currentPage}>
            {i}
          </PaginationLink>
        </PaginationItem>,
      )
    }

    return pageNumbers
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Mes Réservations</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Mes Réservations</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Une erreur est survenue lors du chargement des réservations. Veuillez réessayer plus tard.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const allReservations = data?.userReservations || []

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Mes Réservations</h1>
      </div>

      {allReservations.length > 0 && <StatsCards reservations={allReservations} />}

      {/* Templates section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookTemplate className="h-5 w-5" />
            Mes mod&egrave;les
          </h2>
          <Button size="sm" onClick={handleCreateTemplate}>
            <Plus className="h-4 w-4 mr-1" />
            Nouveau mod&egrave;le
          </Button>
        </div>
        {templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={handleUseTemplate}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-6">
            Aucun mod&egrave;le. Cr&eacute;ez-en un pour r&eacute;server plus rapidement.
          </p>
        )}
      </div>

      <ReservationFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        flightCategoryMapping={flightCategoryMapping}
        resetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {paginatedReservations.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {paginatedReservations.map((reservation: any) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                onEdit={handleEdit}
                flightCategoryMapping={flightCategoryMapping}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} />
                  </PaginationItem>
                )}

                {renderPageNumbers()}

                {currentPage < totalPages && (
                  <PaginationItem>
                    <PaginationNext onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </>
      ) : (
        <EmptyState
          message={
            hasActiveFilters
              ? "Aucune réservation ne correspond à vos critères de recherche."
              : "Vous n'avez pas encore de réservations."
          }
          hasFilters={hasActiveFilters}
          onResetFilters={resetFilters}
        />
      )}

      <ReservationEditDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        reservation={selectedReservation}
        onSave={handleSaveEdit}
        flightCategoryMapping={flightCategoryMapping}
        flightCategoryReverseMapping={flightCategoryReverseMapping}
      />

      <TemplateDialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
        template={editingTemplate}
        aircraftList={aircraftList}
        onSave={handleSaveTemplate}
        loading={creatingTemplate || updatingTemplate}
      />
    </div>
  )
}
