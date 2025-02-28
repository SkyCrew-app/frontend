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
import { GET_USER_FLIGHT_PLANS, UPDATE_FLIGHT_PLAN } from '@/graphql/flights';
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

interface Flight {
  id: number;
  flight_hours: number;
  flight_type: string;
  origin_icao: string;
  destination_icao: string;
  weather_conditions?: string;
  number_of_passengers?: number;
  encoded_polyline?: string;
  distance_km?: number;
  estimated_flight_time?: number;
  waypoints?: string[];
  departure_airport_info?: string;
  arrival_airport_info?: string;
  detailed_waypoints?: string[];
  user: {
    id: number;
    first_name: string;
    last_name: string;
  };
  reservation?: {
    id: number;
    start_time: string;
    end_time: string;
    purpose: string;
    status: string;
    notes?: string;
    flight_category: string;
    aircraft: {
      id: number;
      registration_number: string;
    };
  };
}

const flightTypeTranslations = {
  VFR: 'VFR',
  IFR: 'IFR',
  SVFR: 'SVFR',
  training: 'Entraînement',
  'Generated via AI': 'Généré par IA',
};

const reservationStatusTranslations = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmé',
  CANCELLED: 'Annulé',
};

const getStatusVariant = (status: string) => {
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

export default function MyFlightPlans() {
  const userEmail = useCurrentUser();
  const userData = useUserData(userEmail);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFlightType, setEditFlightType] = useState('');
  const [editWeatherConditions, setEditWeatherConditions] = useState('');
  const [editNumberOfPassengers, setEditNumberOfPassengers] = useState<number | undefined>(undefined);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [flightTypeFilter, setFlightTypeFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    if (userData) {
      setUserId(userData.id);
    }
  }, [userData]);

  const { data: flightPlansData, loading, error } = useQuery(
    GET_USER_FLIGHT_PLANS,
    {
      variables: { userId },
      skip: !userId,
    }
  );

  useEffect(() => {
    if (flightPlansData && flightPlansData.getFlightsByUser) {
      console.log("Flight plans data:", flightPlansData.getFlightsByUser);
    }
  }, [flightPlansData]);

  const filteredFlightPlans = flightPlansData?.getFlightsByUser
    ?.filter((flight: Flight) => {
      const searchTermLower = searchTerm.toLowerCase();
      const originLower = flight.origin_icao.toLowerCase();
      const destinationLower = flight.destination_icao.toLowerCase();
      return (
        (originLower.includes(searchTermLower) || destinationLower.includes(searchTermLower)) &&
        (flightTypeFilter === 'ALL' || flight.flight_type === flightTypeFilter)
      );
    })
    .sort((a: Flight, b: Flight) => {
      if (sortOrder === 'newest') {
        return new Date(b.reservation?.start_time || 0).getTime() - new Date(a.reservation?.start_time || 0).getTime();
      } else {
        return new Date(a.reservation?.start_time || 0).getTime() - new Date(b.reservation?.start_time || 0).getTime();
      }
    }) || [];

  const totalPages = Math.ceil(filteredFlightPlans.length / itemsPerPage);
  const paginatedFlightPlans = filteredFlightPlans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const [updateFlightPlan] = useMutation(UPDATE_FLIGHT_PLAN);

  const handleUpdate = (flight: Flight) => {
    setSelectedFlight(flight);
    setEditFlightType(flight.flight_type || '');
    setEditWeatherConditions(flight.weather_conditions || '');
    setEditNumberOfPassengers(flight.number_of_passengers);
    setIsEditDialogOpen(true);
  };

  const handleUpdateFlightPlan = async () => {
    if (selectedFlight) {
      try {
        await updateFlightPlan({
          variables: {
            input: {
              id: selectedFlight.id,
              flight_type: editFlightType || selectedFlight.flight_type,
              weather_conditions: editWeatherConditions || selectedFlight.weather_conditions,
              number_of_passengers: editNumberOfPassengers || selectedFlight.number_of_passengers,
            },
          },
        });
        setIsEditDialogOpen(false);
        toast({
          title: "Plan de vol mis à jour avec succès!",
          description: `Le plan de vol pour ${selectedFlight.origin_icao} - ${selectedFlight.destination_icao} a été mis à jour.`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur lors de la mise à jour",
          description: "Une erreur est survenue lors de la mise à jour du plan de vol.",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Mes Plans de Vol</h1>
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
        <h1 className="text-3xl font-bold mb-8 text-center">Mes Plans de Vol</h1>
        <p className="text-red-500">Une erreur est survenue lors du chargement des plans de vol.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Mes Plans de Vol</h1>

      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Recherche</Label>
            <Input
              id="search"
              placeholder="Rechercher par aéroport"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="flightType">Type de vol</Label>
            <Select value={flightTypeFilter} onValueChange={setFlightTypeFilter}>
              <SelectTrigger id="flightType">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les types</SelectItem>
                {Object.entries(flightTypeTranslations).map(([key, value]) => (
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

      {paginatedFlightPlans.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedFlightPlans.map((flight: Flight) => (
              <Card
                key={flight.id}
                className="shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full"
              >
                <CardHeader className="text-center">
                  <CardTitle className="flex justify-between text-lg">
                    {flight.origin_icao} - {flight.destination_icao}
                    <Badge
                      variant={
                        flight.reservation
                          ? getStatusVariant(flight.reservation.status)
                          : 'secondary'
                      }
                    >
                      {flight.reservation
                        ? reservationStatusTranslations[
                            flight.reservation.status as keyof typeof reservationStatusTranslations
                          ]
                        : 'Sans réservation'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  {flight.reservation && (
                    <>
                      <p className="text-sm mb-1">
                        <span className="font-semibold">Début :</span>{' '}
                        {format(new Date(flight.reservation.start_time), 'PPPp', {
                          locale: fr,
                        })}
                      </p>
                      <p className="text-sm mb-1">
                        <span className="font-semibold">Fin :</span>{' '}
                        {format(new Date(flight.reservation.end_time), 'PPPp', {
                          locale: fr,
                        })}
                      </p>
                      <p className="text-sm mb-1">
                        <span className="font-semibold">Avion :</span>{' '}
                        {flight.reservation.aircraft.registration_number}
                      </p>
                    </>
                  )}
                  <p className="text-sm mb-1">
                    <span className="font-semibold">Type de vol :</span>{' '}
                    {flightTypeTranslations[
                      flight.flight_type as keyof typeof flightTypeTranslations
                    ] || flight.flight_type}
                  </p>
                  <p className="text-sm mb-1">
                    <span className="font-semibold">Heures de vol :</span>{' '}
                    {flight.flight_hours.toFixed(2)}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Passagers :</span>{' '}
                    {flight.number_of_passengers || 'Non spécifié'}
                  </p>
                </CardContent>
                <div className="flex justify-end space-x-2 p-4">
                  <Button size="sm" onClick={() => handleUpdate(flight)}>
                    Modifier
                  </Button>
                  <Link href={`flight-plans/${flight.id}`}>
                    <Button size="sm" variant="outline">
                      Détails
                    </Button>
                  </Link>
                </div>
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
        <p className="text-center text-gray-500 mt-8">Aucun plan de vol trouvé.</p>
      )}

      {selectedFlight && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogTitle>Modifier le plan de vol</DialogTitle>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="flight-type" className="text-right">
                  Type de vol
                </Label>
                <Select
                  value={editFlightType}
                  onValueChange={(value) => setEditFlightType(value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Type de vol" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(flightTypeTranslations).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="weather-conditions" className="text-right">
                  Conditions météo
                </Label>
                <Input
                  id="weather-conditions"
                  value={editWeatherConditions}
                  onChange={(e) => setEditWeatherConditions(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="number-of-passengers" className="text-right">
                  Passagers
                </Label>
                <Input
                  id="number-of-passengers"
                  type="number"
                  value={editNumberOfPassengers}
                  onChange={(e) => setEditNumberOfPassengers(parseInt(e.target.value))}
                  className="col-span-3"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button onClick={handleUpdateFlightPlan}>
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

