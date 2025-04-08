"use client"

import { useState } from "react"
import { useQuery } from "@apollo/client"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import { type Aircraft, type AircraftsResponse, AvailabilityStatus } from "@/interfaces/aircraft"
import { AircraftCard } from "./aircraft-card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2, Search, Filter } from "lucide-react"
import { CreateAircraftForm } from "./create-aircraft-form"
import { EditAircraftForm } from "./edit-aircraft-form"
import { AircraftDetails } from "./aircraft-details"
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
import { useMutation } from "@apollo/client"
import { DELETE_AIRCRAFT } from "@/graphql/planes"
import { toast } from "@/components/hooks/use-toast"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export function AircraftList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [aircraftToDelete, setAircraftToDelete] = useState<number | null>(null)

  const { loading, error, data, refetch } = useQuery<AircraftsResponse>(GET_AIRCRAFTS)

  const [deleteAircraft, { loading: deleteLoading }] = useMutation(DELETE_AIRCRAFT, {
    onCompleted: () => {
      toast({
        title: "Aéronef supprimé",
        description: "L'aéronef a été supprimé avec succès.",
      })
      refetch()
      setIsDeleteDialogOpen(false)
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la suppression de l'aéronef: ${error.message}`,
        variant: "destructive",
      })
    },
  })

  const handleEdit = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft)
    setIsEditModalOpen(true)
  }

  const handleDelete = (id: number) => {
    setAircraftToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (aircraftToDelete) {
      deleteAircraft({
        variables: {
          aircraftId: aircraftToDelete,
        },
      })
    }
  }

  const handleViewDetails = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft)
    setIsDetailsModalOpen(true)
  }

  const filteredAircrafts = (data?.getAircrafts ?? [])
    .filter((aircraft) => {
      const matchesSearch =
        aircraft.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aircraft.model.toLowerCase().includes(searchTerm.toLowerCase())

      if (statusFilter === "all") return matchesSearch
      return matchesSearch && aircraft.availability_status === statusFilter
    })
    .sort((a, b) => a.registration_number.localeCompare(b.registration_number))

  if (loading)
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )

  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
        Erreur lors du chargement des aéronefs: {error.message}
      </div>
    )

  return (
    <div className="space-y-6">
      {/* Mobile filter sheet */}
      <div className="flex items-center gap-3 sm:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="flex-shrink-0">
              <Filter className="h-4 w-4" />
              <span className="sr-only">Filtres</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[300px]">
            <SheetHeader>
              <SheetTitle>Filtres</SheetTitle>
            </SheetHeader>
            <div className="py-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile-status-filter">Statut</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="mobile-status-filter">
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value={AvailabilityStatus.AVAILABLE}>Disponible</SelectItem>
                      <SelectItem value={AvailabilityStatus.UNAVAILABLE}>Indisponible</SelectItem>
                      <SelectItem value={AvailabilityStatus.RESERVED}>Réservé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button className="w-full">Appliquer les filtres</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop filters */}
      <div className="hidden sm:flex sm:flex-col sm:gap-4 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="search">Rechercher</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Immatriculation ou modèle..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status-filter">Statut</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value={AvailabilityStatus.AVAILABLE}>Disponible</SelectItem>
                <SelectItem value={AvailabilityStatus.UNAVAILABLE}>Indisponible</SelectItem>
                <SelectItem value={AvailabilityStatus.RESERVED}>Réservé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filteredAircrafts && filteredAircrafts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAircrafts.map((aircraft) => (
            <AircraftCard
              key={aircraft.id}
              aircraft={aircraft}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed p-4 text-center">
          <div className="space-y-2">
            <p className="text-lg font-medium">Aucun aéronef trouvé</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || statusFilter !== "all"
                ? "Essayez de modifier vos filtres de recherche."
                : "Commencez par ajouter un nouvel aéronef à votre flotte."}
            </p>
          </div>
        </div>
      )}

      <CreateAircraftForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          refetch()
          setIsCreateModalOpen(false)
        }}
      />

      {selectedAircraft && (
        <>
          <EditAircraftForm
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            aircraft={selectedAircraft}
            onSuccess={() => {
              refetch()
              setIsEditModalOpen(false)
            }}
          />

          <AircraftDetails
            isOpen={isDetailsModalOpen}
            onClose={() => setIsDetailsModalOpen(false)}
            aircraft={selectedAircraft}
            onEdit={() => {
              setIsDetailsModalOpen(false)
              setIsEditModalOpen(true)
            }}
          />
        </>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cet aéronef ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données associées à cet aéronef seront définitivement
              supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
