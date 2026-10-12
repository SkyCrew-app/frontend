"use client"

import { useState } from "react"
import { useMutation, useQuery } from "@apollo/client"
import { Loader2, Plane, Plus, Search } from "lucide-react"
import { DELETE_AIRCRAFT, GET_AIRCRAFTS } from "@/graphql/planes"
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
import { AIRCRAFT_AVAILABILITY_VALUES, aircraftAvailability } from "@/lib/aircraft"

interface AircraftListProps {
  /** Opens the creation form, owned by the page. */
  onCreate: () => void
}

export function AircraftList({ onCreate }: AircraftListProps) {
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
    onCompleted: () => {
      toast({
        title: "Aéronef supprimé",
        description: aircraftToDelete
          ? `${aircraftToDelete.registration_number} a été retiré de la flotte.`
          : undefined,
      })
      setAircraftToDelete(null)
    },
    onError: () => {
      toast({
        title: "Suppression impossible",
        description:
          "L'aéronef n'a pas pu être supprimé. Il est peut-être encore lié à des réservations ou à des maintenances.",
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
      <div className="space-y-6" aria-busy="true" aria-label="Chargement des aéronefs">
        <Skeleton className="h-10 w-full sm:max-w-md" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
            placeholder="Immatriculation ou modèle"
            aria-label="Rechercher un aéronef"
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[220px]" aria-label="Filtrer par disponibilité">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les disponibilités</SelectItem>
            {AIRCRAFT_AVAILABILITY_VALUES.map((status) => (
              <SelectItem key={status} value={status}>
                {aircraftAvailability(status).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredAircrafts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          title="Aucun aéronef ne correspond"
          description="Modifiez la recherche ou le filtre de disponibilité."
          action={
            <Button variant="outline" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={Plane}
          title="Aucun aéronef"
          description="Ajoutez le premier aéronef de la flotte pour pouvoir le réserver et suivre sa maintenance."
          action={
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Ajouter un aéronef
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
      />

      <AlertDialog
        open={aircraftToDelete !== null}
        onOpenChange={(open) => !open && !deleteLoading && setAircraftToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {aircraftToDelete?.registration_number} ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;aéronef {aircraftToDelete?.registration_number} ({aircraftToDelete?.model}) sera définitivement
              retiré de la flotte, avec sa photo et ses documents. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Annuler</AlertDialogCancel>
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
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
