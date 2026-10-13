"use client"

import { useMutation, useQuery } from "@apollo/client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
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
  DELETE_RESERVATION,
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
import { apiRefusalMessage } from "@/components/reservation/api-refusal"
import type { Reservation } from "@/interfaces/reservation"
import { formatDate, formatTime } from "@/lib/format"
import type { ReservationTemplate } from "@/interfaces/reservation-template"

const ITEMS_PER_PAGE = 6

export default function MyReservations() {
  const { t } = useTranslation("reservations")
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const router = useRouter()
  const userId: string | number | null = userData?.id ?? null
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ReservationTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<ReservationTemplate | null>(null)
  const [reservationToCancel, setReservationToCancel] = useState<Reservation | null>(null)
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
  // Same mutation as the calendar: the API checks that the booking is the caller's.
  const [deleteReservation, { loading: cancellingReservation }] = useMutation(DELETE_RESERVATION)

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
        title: t("toast.updated.title"),
        description: t("toast.updated.description", { aircraft: selectedReservation.aircraft.registration_number }),
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("toast.updateFailed.title"),
        description: apiRefusalMessage(error, t("toast.updateFailed.description")),
      })
    }
  }

  const handleAskCancel = (reservation: Reservation) => {
    setIsEditDialogOpen(false)
    setReservationToCancel(reservation)
  }

  const handleCancelReservation = async () => {
    if (!reservationToCancel) return
    try {
      await deleteReservation({
        variables: { id: Number(reservationToCancel.id) },
        refetchQueries: [{ query: GET_USER_RESERVATIONS, variables: { userId } }],
        awaitRefetchQueries: true,
      })
      toast({
        title: t("toast.cancelled.title"),
        description: t("toast.cancelled.description", { aircraft: reservationToCancel.aircraft.registration_number }),
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("toast.cancelFailed.title"),
        description: apiRefusalMessage(error, t("toast.cancelFailed.description")),
      })
    } finally {
      setReservationToCancel(null)
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
        toast({ title: t("toast.templateUpdated.title") })
      } else {
        await createTemplate({
          variables: { input: data },
          refetchQueries: [{ query: GET_MY_TEMPLATES }],
        })
        toast({ title: t("toast.templateCreated.title") })
      }
      setIsTemplateDialogOpen(false)
    } catch {
      toast({
        variant: "destructive",
        title: t("toast.templateSaveFailed.title"),
        description: t("toast.templateSaveFailed.description"),
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
      toast({ title: t("toast.templateDeleted.title") })
    } catch {
      toast({
        variant: "destructive",
        title: t("toast.templateDeleteFailed.title"),
        description: t("toast.templateDeleteFailed.description"),
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
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  onEdit={handleEdit}
                  onCancel={handleAskCancel}
                />
              ))}
            </div>
            <ListPager
              page={page}
              pageCount={totalPages}
              onPageChange={setCurrentPage}
              total={filteredReservations.length}
              noun={[t("my.pager.singular"), t("my.pager.plural")]}
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
        title={t("my.title")}
        description={t("my.description")}
        actions={
          <Button asChild>
            <Link href="/reservations">
              <Plus className="h-4 w-4" />
              {t("shared.newReservation")}
            </Link>
          </Button>
        }
      />

      {allReservations.length > 0 && <StatsCards reservations={allReservations} />}

      <Tabs defaultValue="reservations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reservations">{t("my.tabs.reservations")}</TabsTrigger>
          <TabsTrigger value="templates">
            {templates.length > 0 ? t("my.tabs.templatesWithTotal", { total: templates.length }) : t("my.tabs.templates")}
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
                  {t("template.intro")}
                </p>
                <Button variant="outline" onClick={handleCreateTemplate} className="self-start sm:self-auto">
                  <BookmarkPlus className="h-4 w-4" />
                  {t("template.new")}
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
              title={t("template.empty.title")}
              description={t("template.empty.description")}
              action={
                <Button onClick={handleCreateTemplate}>
                  <Plus className="h-4 w-4" />
                  {t("template.empty.action")}
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
        onCancelReservation={handleAskCancel}
      />

      <AlertDialog
        open={reservationToCancel !== null}
        onOpenChange={(open) => !open && !cancellingReservation && setReservationToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("my.cancelConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {reservationToCancel &&
                t("my.cancelConfirm.description", {
                  aircraft: reservationToCancel.aircraft.registration_number,
                  date: formatDate(reservationToCancel.start_time),
                  start: formatTime(reservationToCancel.start_time),
                  end: formatTime(reservationToCancel.end_time),
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancellingReservation}>{t("my.cancelConfirm.keep")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancellingReservation}
              onClick={(event) => {
                event.preventDefault()
                void handleCancelReservation()
              }}
            >
              {cancellingReservation && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("my.cancelConfirm.action")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <AlertDialogTitle>{t("template.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("template.deleteConfirm.description", { name: templateToDelete?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTemplate}>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingTemplate}
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteTemplate()
              }}
            >
              {deletingTemplate && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("template.deleteConfirm.action")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
