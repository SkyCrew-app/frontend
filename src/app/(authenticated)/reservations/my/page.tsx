"use client"

import { useMutation, useQuery } from "@apollo/client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookmarkPlus, Loader2, Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { PageHeader } from "@/components/layout/PageHeader"
import { ErrorState } from "@/components/layout/ErrorState"
import { EmptyState as SharedEmptyState } from "@/components/layout/EmptyState"
import { ReservationCard } from "@/components/my-reservation/reservation-card"
import { ReservationFilters, type ReservationSortOrder } from "@/components/my-reservation/reservation-filters"
import { ReservationEditDialog } from "@/components/my-reservation/reservation-edit-dialog"
import { EmptyState } from "@/components/my-reservation/empty-state"
import { StatsCards } from "@/components/my-reservation/stats-cards"
import { TemplateCard } from "@/components/my-reservation/template-card"
import { TemplateDialog } from "@/components/my-reservation/template-dialog"
import { ListPager } from "@/components/reservation/list-pager"
import type { Reservation } from "@/interfaces/reservation"
import type { ReservationTemplate } from "@/interfaces/reservation-template"

const ITEMS_PER_PAGE = 6

export default function MyReservations() {
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const router = useRouter()
  const userId: string | number | null = userData?.id ?? null
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ReservationTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<ReservationTemplate | null>(null)
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  const [sortOrder, setSortOrder] = useState<ReservationSortOrder>("newest")
  const [currentPage, setCurrentPage] = useState(1)

  const { data, loading, error, refetch } = useQuery(GET_USER_RESERVATIONS, {
    variables: { userId },
    skip: !userId,
  })

  const [updateReservation] = useMutation(UPDATE_RESERVATION)

  const { data: templatesData } = useQuery(GET_MY_TEMPLATES)
  const { data: aircraftData } = useQuery(GET_AIRCRAFTS)
  const [createTemplate, { loading: creatingTemplate }] = useMutation(CREATE_RESERVATION_TEMPLATE)
  const [updateTemplate, { loading: updatingTemplate }] = useMutation(UPDATE_RESERVATION_TEMPLATE)
  const [deleteTemplate, { loading: deletingTemplate }] = useMutation(DELETE_RESERVATION_TEMPLATE)

  // Any change of filter or sort goes back to the first page.
  const onFilterChange =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setCurrentPage(1)
    }

  const resetFilters = () => {
    setSearchTerm("")
    setStatusFilter("ALL")
    setCategoryFilter("ALL")
    setCurrentPage(1)
  }

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "ALL" || categoryFilter !== "ALL"

  const allReservations: Reservation[] = data?.userReservations ?? []

  const filteredReservations = allReservations
    .filter((reservation) => {
      const searchTermLower = searchTerm.trim().toLowerCase()
      const purposeLower = (reservation.purpose || "").toLowerCase()
      const registrationLower = reservation.aircraft.registration_number.toLowerCase()

      return (
        (purposeLower.includes(searchTermLower) || registrationLower.includes(searchTermLower)) &&
        (statusFilter === "ALL" || reservation.status === statusFilter) &&
        (categoryFilter === "ALL" || reservation.flight_category === categoryFilter)
      )
    })
    .sort((a, b) => {
      const difference = new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      return sortOrder === "newest" ? -difference : difference
    })

  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / ITEMS_PER_PAGE))
  const page = Math.min(currentPage, totalPages)
  const paginatedReservations = filteredReservations.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleEdit = (reservation: Reservation) => {
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
        description: `La réservation de ${selectedReservation.aircraft.registration_number} a été modifiée.`,
      })
    } catch {
      toast({
        variant: "destructive",
        title: "Modification impossible",
        description: "La réservation n'a pas pu être modifiée. Réessayez dans un instant.",
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
        toast({ title: "Modèle mis à jour" })
      } else {
        await createTemplate({
          variables: { input: data },
          refetchQueries: [{ query: GET_MY_TEMPLATES }],
        })
        toast({ title: "Modèle créé" })
      }
      setIsTemplateDialogOpen(false)
    } catch {
      toast({
        variant: "destructive",
        title: "Enregistrement impossible",
        description: "Le modèle n'a pas pu être enregistré. Réessayez dans un instant.",
      })
    }
  }

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return
    try {
      await deleteTemplate({
        variables: { id: templateToDelete.id },
        refetchQueries: [{ query: GET_MY_TEMPLATES }],
      })
      toast({ title: "Modèle supprimé" })
    } catch {
      toast({
        variant: "destructive",
        title: "Suppression impossible",
        description: "Le modèle n'a pas pu être supprimé. Réessayez dans un instant.",
      })
    } finally {
      setTemplateToDelete(null)
    }
  }

  const handleUseTemplate = (template: ReservationTemplate) => {
    // The calendar opens its reservation form pre-filled with these values.
    const params = new URLSearchParams()
    if (template.aircraft?.id) params.set("aircraft_id", template.aircraft.id.toString())
    if (template.preferred_start_time) params.set("start_time", template.preferred_start_time)
    if (template.preferred_end_time) params.set("end_time", template.preferred_end_time)
    if (template.flight_category) params.set("flight_category", template.flight_category)
    if (template.purpose) params.set("purpose", template.purpose)
    if (template.notes) params.set("notes", template.notes)
    router.push(`/reservations?${params.toString()}`)
  }

  // The reservations query waits for the signed-in user.
  const isLoading = loading || (!userId && !error)

  const renderReservations = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      )
    }

    if (error) {
      return <ErrorState onRetry={() => refetch()} />
    }

    if (allReservations.length === 0) {
      return <EmptyState />
    }

    return (
      <>
        <ReservationFilters
          searchTerm={searchTerm}
          setSearchTerm={onFilterChange(setSearchTerm)}
          statusFilter={statusFilter}
          setStatusFilter={onFilterChange(setStatusFilter)}
          categoryFilter={categoryFilter}
          setCategoryFilter={onFilterChange(setCategoryFilter)}
          sortOrder={sortOrder}
          setSortOrder={onFilterChange(setSortOrder)}
          resetFilters={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {paginatedReservations.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedReservations.map((reservation) => (
                <ReservationCard key={reservation.id} reservation={reservation} onEdit={handleEdit} />
              ))}
            </div>
            <ListPager
              page={page}
              pageCount={totalPages}
              onPageChange={setCurrentPage}
              total={filteredReservations.length}
              noun={["réservation", "réservations"]}
            />
          </>
        ) : (
          <EmptyState hasFilters onResetFilters={resetFilters} />
        )}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title="Mes réservations"
        description="Vos réservations d'avion et les modèles qui vous font gagner du temps."
        actions={
          <Button asChild>
            <Link href="/reservations">
              <Plus className="h-4 w-4" />
              Nouvelle réservation
            </Link>
          </Button>
        }
      />

      {allReservations.length > 0 && <StatsCards reservations={allReservations} />}

      <Tabs defaultValue="reservations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reservations">Réservations</TabsTrigger>
          <TabsTrigger value="templates">
            Modèles{templates.length > 0 ? ` (${templates.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reservations" className="mt-0 space-y-6">
          {renderReservations()}
        </TabsContent>

        <TabsContent value="templates" className="mt-0 space-y-6">
          {templates.length > 0 ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Un modèle préremplit le formulaire de réservation pour vos vols habituels.
                </p>
                <Button variant="outline" onClick={handleCreateTemplate} className="self-start sm:self-auto">
                  <BookmarkPlus className="h-4 w-4" />
                  Nouveau modèle
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={handleUseTemplate}
                    onEdit={handleEditTemplate}
                    onDelete={setTemplateToDelete}
                  />
                ))}
              </div>
            </>
          ) : (
            <SharedEmptyState
              icon={BookmarkPlus}
              title="Aucun modèle de réservation"
              description="Enregistrez vos vols habituels (avion, horaire, catégorie) pour réserver en deux clics."
              action={
                <Button onClick={handleCreateTemplate}>
                  <Plus className="h-4 w-4" />
                  Créer un modèle
                </Button>
              }
            />
          )}
        </TabsContent>
      </Tabs>

      <ReservationEditDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        reservation={selectedReservation}
        onSave={handleSaveEdit}
      />

      <TemplateDialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
        template={editingTemplate}
        aircraftList={aircraftList}
        onSave={handleSaveTemplate}
        loading={creatingTemplate || updatingTemplate}
      />

      <AlertDialog open={templateToDelete !== null} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le modèle « {templateToDelete?.name} » sera définitivement supprimé. Vos réservations existantes ne sont
              pas modifiées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTemplate}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingTemplate}
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteTemplate()
              }}
            >
              {deletingTemplate && <Loader2 className="h-4 w-4 animate-spin" />}
              Supprimer le modèle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
