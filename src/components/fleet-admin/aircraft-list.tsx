"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery } from "@apollo/client"
import { Loader2, Plane, Plus, Search } from "lucide-react"
import { DELETE_AIRCRAFT, GET_AIRCRAFTS } from "@/graphql/planes"
import { apiRefusal } from "@/lib/api-refusal"
import type { Aircraft, AircraftsResponse } from "@/interfaces/aircraft"
import { AircraftCard } from "./aircraft-card"
import { AircraftFormDialog } from "./aircraft-form-dialog"
import { AircraftDetailDialog } from "@/components/fleet/aircraft-detail-dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { ErrorState } from "@/components/layout/ErrorState"
import { EmptyState } from "@/components/layout/EmptyState"
import { toast } from "@/components/hooks/use-toast"
import { aircraftAvailability, offeredAvailabilities } from "@/lib/aircraft"

interface AircraftListProps {
  /** Opens the creation form, owned by the page. */
  onCreate: () => void
}

export function AircraftList({ onCreate }: AircraftListProps) {
  const { t } = useTranslation("fleet")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [aircraftToDelete, setAircraftToDelete] = useState<Aircraft | null>(null)

  const { loading, error, data, refetch } = useQuery<AircraftsResponse>(GET_AIRCRAFTS)

  const [deleteAircraft, { loading: deleteLoading }] = useMutation(DELETE_AIRCRAFT, {
    refetchQueries: [{ query: GET_AIRCRAFTS }],
    awaitRefetchQueries: true,
    onCompleted: (result) => {
      // The API never deletes an aircraft that has a history: it answers false and retires it.
      const outcome = result?.deleteAircraft === false ? "retired" : "deleted"
      toast({
        title: t(`admin.toast.${outcome}.title`),
        description: aircraftToDelete
          ? t(`admin.toast.${outcome}.description`, { registration: aircraftToDelete.registration_number })
          : undefined,
      })
      setAircraftToDelete(null)
    },
    onError: (deleteError) => {
      // A refusal (upcoming bookings…) is explained by the API.
      toast({
        title: t("shared.deleteFailed"),
        description: apiRefusal(deleteError, t("admin.toast.deleteFailed.description")),
        variant: "destructive",
      })
    },
  })

  const handleEdit = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft)
    setIsDetailsModalOpen(false)
    setIsEditModalOpen(true)
  }

  const handleViewDetails = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft)
    setIsDetailsModalOpen(true)
  }

  const confirmDelete = () => {
    if (aircraftToDelete) {
      deleteAircraft({ variables: { aircraftId: aircraftToDelete.id } })
    }
  }

  const resetFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
  }

  const search = searchTerm.trim().toLowerCase()
  const hasFilters = search !== "" || statusFilter !== "all"
  const filteredAircrafts = (data?.getAircrafts ?? [])
    .filter((aircraft) => {
      const matchesSearch =
        aircraft.registration_number.toLowerCase().includes(search) || aircraft.model.toLowerCase().includes(search)

      return matchesSearch && (statusFilter === "all" || aircraft.availability_status === statusFilter)
    })
    .sort((a, b) => a.registration_number.localeCompare(b.registration_number))

  // The dialogs show the refreshed aircraft after an edit.
  const shownAircraft = selectedAircraft
    ? (data?.getAircrafts.find((aircraft) => aircraft.id === selectedAircraft.id) ?? selectedAircraft)
    : null

  if (loading && !data) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label={t("admin.loading")}>
        <Skeleton className="h-10 w-full sm:max-w-md" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error && !data) {
    return <ErrorState onRetry={() => refetch().catch(() => undefined)} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t("shared.searchPlaceholder")}
            aria-label={t("shared.searchLabel")}
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[220px]" aria-label={t("shared.filterByAvailability")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("shared.allAvailabilities")}</SelectItem>
            {offeredAvailabilities((data?.getAircrafts ?? []).map((aircraft) => aircraft.availability_status)).map((status) => (
              <SelectItem key={status} value={status}>
                {aircraftAvailability(status).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredAircrafts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {filteredAircrafts.map((aircraft) => (
            <AircraftCard
              key={aircraft.id}
              aircraft={aircraft}
              onEdit={handleEdit}
              onDelete={setAircraftToDelete}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      ) : hasFilters ? (
        <EmptyState
          icon={Search}
          title={t("shared.noMatchTitle")}
          description={t("shared.noMatchDescription")}
          action={
            <Button variant="outline" onClick={resetFilters}>
              {t("shared.resetFilters")}
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={Plane}
          title={t("shared.noAircraft")}
          description={t("admin.emptyDescription")}
          action={
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("shared.addAircraft")}
            </Button>
          }
        />
      )}

      <AircraftFormDialog
        isOpen={isEditModalOpen && shownAircraft !== null}
        onClose={() => setIsEditModalOpen(false)}
        aircraft={shownAircraft}
        onSuccess={() => setIsEditModalOpen(false)}
      />

      <AircraftDetailDialog
        aircraft={shownAircraft}
        isOpen={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        onEdit={handleEdit}
        canReturnToService
      />

      <AlertDialog
        open={aircraftToDelete !== null}
        onOpenChange={(open) => !open && !deleteLoading && setAircraftToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.deleteDialog.title", { registration: aircraftToDelete?.registration_number ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.deleteDialog.description", {
                registration: aircraftToDelete?.registration_number ?? "",
                model: aircraftToDelete?.model ?? "",
              })}{" "}
              {t("admin.deleteDialog.historyNote")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              // Stays open until the deletion is done.
              onClick={(event) => {
                event.preventDefault()
                confirmDelete()
              }}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {t("common:actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
