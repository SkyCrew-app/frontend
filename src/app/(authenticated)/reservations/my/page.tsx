'use client';

import { useMutation, useQuery } from '@apollo/client';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from "@/components/hooks/use-toast";
import { Label } from '@/components/ui/label';
import { GET_USER_RESERVATIONS, UPDATE_RESERVATION } from '@/graphql/reservation';
import { ReservationStatus } from '@/interfaces/reservation';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { useCurrentUser, useUserData } from '@/components/hooks/userHooks';

interface Reservation {
  id: number;
  user_id: number;
  aircraft_id: number;
  start_time: string;
  end_time: string;
  purpose: string;
  notes?: string;
  status: ReservationStatus;
  flight_category: string;
  aircraft: {
    registration_number: string;
  };
  flights?: {
    id: number
  }[];
}

const flightCategoryMapping = {
  LOCAL: 'Local',
  CROSS_COUNTRY: 'Vol longue distance',
  INSTRUCTION: 'Instruction',
  TOURISM: 'Tourisme',
  TRAINING: 'Entraînement',
  MAINTENANCE: 'Maintenance',
  PRIVATE: 'Privé',
  CORPORATE: 'Affaires',
};

const flightCategoryReverseMapping = Object.fromEntries(
  Object.entries(flightCategoryMapping).map(([key, value]) => [value, key])
);

const statusTranslations = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmé',
  CANCELLED: 'Annulé',
};

const getStatusVariant = (status: ReservationStatus) => {
  switch (status) {
    case 'PENDING':
      return 'secondary';
    case 'CONFIRMED':
      return 'default';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'default';
  }
};

export default function MyReservations() {
  const userEmail = useCurrentUser();
  const userData = useUserData(userEmail);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editPurpose, setEditPurpose] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editFlightCategory, setEditFlightCategory] = useState('');
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;


  useEffect(() => {
    if (userData) {
      setUserId(userData.id);
    }
  }, [userData]);

  const { data: reservationsData, loading, error } = useQuery(
    GET_USER_RESERVATIONS,
    {
      variables: { userId },
      skip: !userId,
    }
  );

  const filteredReservations = reservationsData?.userReservations
  ?.filter((reservation: Reservation) => {
    const searchTermLower = searchTerm.toLowerCase();
    const purposeLower = reservation.purpose.toLowerCase();
    const registrationLower = reservation.aircraft.registration_number.toLowerCase();
    return (
      (purposeLower.includes(searchTermLower) || registrationLower.includes(searchTermLower)) &&
      (statusFilter === 'ALL' || reservation.status === statusFilter) &&
      (categoryFilter === 'ALL' || reservation.flight_category === categoryFilter)
    );
  })
  .sort((a: Reservation, b: Reservation) => {
    if (sortOrder === 'newest') {
      return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
    } else {
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    }
  }) || [];

  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
  const paginatedReservations = filteredReservations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  const [updateReservation] = useMutation(UPDATE_RESERVATION);

  const handleUpdate = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setEditPurpose(reservation.purpose || '');
    setEditNotes(reservation.notes || '');
    setEditFlightCategory(reservation.flight_category || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateReservation = async () => {
    if (selectedReservation) {
      try {
        await updateReservation({
          variables: {
            input: {
              id: selectedReservation.id,
              purpose: editPurpose || selectedReservation.purpose,
              notes: editNotes || selectedReservation.notes,
              flight_category: editFlightCategory || selectedReservation.flight_category,
            },
          },
        });
        setIsEditDialogOpen(false);
        toast({
          title: "Réservation mise à jour avec succès!",
          description: `La réservation pour l'avion ${selectedReservation.aircraft.registration_number} a été mise à jour.`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur lors de la mise à jour",
          description: "Une erreur est survenue lors de la mise à jour de la réservation.",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Mes Réservations</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Mes Réservations</h1>
        <p className="text-red-500">Une erreur est survenue lors du chargement des réservations.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Mes Réservations</h1>

      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Recherche</Label>
            <Input
              id="search"
              placeholder="Rechercher par but ou avion"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="CONFIRMED">Confirmé</SelectItem>
                <SelectItem value="CANCELLED">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes les catégories</SelectItem>
                {Object.entries(flightCategoryMapping).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label>Trier par :</Label>
            <Button
              variant={sortOrder === 'newest' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortOrder('newest')}
            >
              Plus récent
            </Button>
            <Button
              variant={sortOrder === 'oldest' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortOrder('oldest')}
            >
              Plus ancien
            </Button>
          </div>
        </div>
      </div>

      {paginatedReservations.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedReservations.map((reservation: Reservation) => (
              <Card key={reservation.id} className="shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="text-center">
                  <CardTitle className="flex justify-between text-lg">
                    {reservation.aircraft.registration_number}
                    <Badge variant={getStatusVariant(reservation.status as ReservationStatus)}>
                      {statusTranslations[reservation.status as keyof typeof statusTranslations]}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <p className="text-sm  mb-1">
                    <span className="font-semibold">Début :</span> {format(new Date(reservation.start_time), 'PPPp', { locale: fr })}
                  </p>
                  <p className="text-sm  mb-1">
                    <span className="font-semibold">Fin :</span> {format(new Date(reservation.end_time), 'PPPp', { locale: fr })}
                  </p>
                  <p className="text-sm  mb-1">
                    <span className="font-semibold">But :</span> {reservation.purpose}
                  </p>
                  <p className="text-sm  mb-4">
                    <span className="font-semibold">Catégorie :</span> {flightCategoryMapping[reservation.flight_category as keyof typeof flightCategoryMapping]}
                  </p>
                  <div className="flex justify-end space-x-2">
                    <Button size="sm" onClick={() => handleUpdate(reservation)}>Modifier</Button>
                    {reservation.flights && reservation.flights.length > 0 && (
                        <Link href={`flight-plans/${reservation.flights[0].id}`}>
                        <Button size="sm" variant="outline">Plan de vol</Button>
                        </Link>
                    )}
                  {!reservation.flights || reservation.flights.length === 0 ? (
                    <Link href={`flight-plans/create/${reservation.id}`}>
                    <Button size="sm" variant="outline">Créer un plan de vol</Button>
                    </Link>
                  ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} />
                  </PaginationItem>
                )}
                {[...Array(totalPages)].map((_, index) => (
                  <PaginationItem key={index}>
                    <PaginationLink
                      onClick={() => setCurrentPage(index + 1)}
                      isActive={currentPage === index + 1}
                    >
                      {index + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {currentPage < totalPages && (
                  <PaginationItem>
                    <PaginationNext onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        </>
      ) : (
        <p className="text-center text-gray-500 mt-8">Aucune réservation trouvée.</p>
      )}

      {selectedReservation && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogTitle>Modifier la réservation</DialogTitle>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="aircraft" className="text-right">
                  Avion
                </Label>
                <Input id="aircraft" value={selectedReservation.aircraft.registration_number} className="col-span-3" disabled />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="start-time" className="text-right">
                  Début
                </Label>
                <Input id="start-time" value={format(new Date(selectedReservation.start_time), 'PPPp', { locale: fr })} className="col-span-3" disabled />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="end-time" className="text-right">
                  Fin
                </Label>
                <Input id="end-time" value={format(new Date(selectedReservation.end_time), 'PPPp', { locale: fr })} className="col-span-3" disabled />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="purpose" className="text-right">
                  But
                </Label>
                <Input
                  id="purpose"
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Input
                  id="notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Catégorie
                </Label>
                <Select
                  value={flightCategoryMapping[editFlightCategory as keyof typeof flightCategoryMapping]}
                  onValueChange={(value) => {
                    setEditFlightCategory(flightCategoryReverseMapping[value]);
                  }}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Catégorie de vol" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(flightCategoryMapping).map((categoryFr) => (
                      <SelectItem key={categoryFr} value={categoryFr}>
                        {categoryFr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button onClick={handleUpdateReservation}>
                Sauvegarder
              </Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

