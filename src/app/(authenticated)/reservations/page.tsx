'use client';

import { useMutation, useQuery } from '@apollo/client';
import { useState, useEffect } from 'react';
import { format, addDays, subDays, eachHourOfInterval, addWeeks, subWeeks, isBefore, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, Trash, Edit } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from "@/components/hooks/use-toast";
import { Label } from '@/components/ui/label';
import { CREATE_RESERVATION, DELETE_RESERVATION, GET_FILTERED_RESERVATIONS, UPDATE_RESERVATION } from '@/graphql/reservation';
import { GET_AIRCRAFTS } from '@/graphql/planes';
import { Reservation, ReservationStatus } from '@/interfaces/reservation';
import { GET_SETTINGS } from '@/graphql/settings';
import { useCurrentUser, useUserData } from '@/components/hooks/userHooks';

interface Aircraft {
  id: number;
  registration_number: string;
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

export default function ReservationCalendar() {
  const [currentDate, setCurrentDate] = useState<Date | undefined>(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [selectedAircraft, setSelectedAircraft] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredTime, setHoveredTime] = useState<string | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [flightCategory, setFlightCategory] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editPurpose, setEditPurpose] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editFlightCategory, setEditFlightCategory] = useState('');
  const [selectedCategoryFr, setSelectedCategoryFr] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const formattedDate = currentDate ? format(currentDate, 'yyyy-MM-dd') : '';
  const nextDate = format(addDays(currentDate || new Date(), 1), 'yyyy-MM-dd');
  const [disabledDays, setDisabledDays] = useState<string[]>([]);
  const [hours, setHours] = useState<Date[]>([]);
  const userEmail = useCurrentUser();
  const userData = useUserData(userEmail);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const [createReservation] = useMutation(CREATE_RESERVATION);
  const [updateReservation] = useMutation(UPDATE_RESERVATION);
  const [deleteReservation] = useMutation(DELETE_RESERVATION);


  const { data: settingsData, loading: loadingSettings, error: errorSettings, refetch: refetchSettings } = useQuery(
    GET_SETTINGS,
    {
      fetchPolicy: 'network-only',
    }
  );

  useEffect(() => {
    if (userData) {
      setUserId(userData.id);
    }
  }, [userData]);

  const { data: aircraftData, loading: loadingAircrafts, error: errorAircrafts } = useQuery(GET_AIRCRAFTS);

  const { data: reservationData, loading: loadingReservations, error: errorReservations } = useQuery(
    GET_FILTERED_RESERVATIONS,
    {
      variables: { startDate: formattedDate, endDate: nextDate },
    }
  );

  useEffect(() => {
    if (settingsData?.getAllAdministrations?.length > 0) {
      const { closureDays, reservationStartTime, reservationEndTime } = settingsData.getAllAdministrations[0];

      const formattedDate = currentDate ? format(currentDate, 'yyyy-MM-dd') : '';
      const newHours = eachHourOfInterval({
        start: new Date(`${formattedDate}T${reservationStartTime}`),
        end: new Date(`${formattedDate}T${reservationEndTime}`),
      });

      setHours(newHours);
      setDisabledDays(closureDays);
    }
  }, [settingsData, currentDate]);

  const normalizeDayName = (day: string) => day.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const isDayClosed = () => {
    const dayName = normalizeDayName(format(currentDate || new Date(), 'EEEE', { locale: fr }));
    const normalizedDisabledDays = disabledDays.map(normalizeDayName);
    return normalizedDisabledDays.includes(dayName);
  };

  const handlePreviousDay = () => {
    setCurrentDate((prevDate) => subDays(prevDate || new Date(), 1));
  };

  const handleNextDay = () => {
    setCurrentDate((prevDate) => addDays(prevDate || new Date(), 1));
  };

  const handlePreviousWeek = () => {
    setCurrentDate((prevDate) => subWeeks(prevDate || new Date(), 1));
  };

  const handleNextWeek = () => {
    setCurrentDate((prevDate) => addWeeks(prevDate || new Date(), 1));
  };

  const handleMouseDown = (aircraftId: number, time: string) => {
    setSelectedTimeRange({ start: time, end: null });
    setSelectedAircraft(aircraftId);
    setIsDragging(true);
  };

  const handleMouseEnter = (hour: Date) => {
    if (isDragging) {
      const timeString = format(hour, 'HH:mm');
      setHoveredTime(timeString);
      setSelectedTimeRange((prev) => ({ ...prev, end: timeString }));
    }
  };

  const handleMouseUp = () => {
    if (selectedTimeRange.start && selectedTimeRange.end && selectedAircraft) {
      setIsCreateDialogOpen(true);
    }
    setIsDragging(false);
  };

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsReservationDialogOpen(true);
  };

  const handleUpdate = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setEditPurpose(reservation.purpose || '');
    setEditNotes(reservation.notes || '');
    setEditFlightCategory(reservation.flight_category || '');
    setIsReservationDialogOpen(false);
    setIsEditDialogOpen(true);
  };

  const handleCreateReservation = async () => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de trouver l'utilisateur actuel.",
      });
      return;
    }

    try {
      const startTime = new Date(`${formattedDate}T${selectedTimeRange.start}`);
      const endTime = new Date(`${formattedDate}T${selectedTimeRange.end}`);
      const estimatedFlightHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      const response = await createReservation({
        variables: {
          input: {
            aircraft_id: selectedAircraft,
            start_time: startTime,
            end_time: endTime,
            purpose,
            user_id: userId,
            estimated_flight_hours: estimatedFlightHours,
            status: ReservationStatus.PENDING,
            notes,
            flight_category: flightCategory,
          },
        },
      });

      if (response.errors) {
        const errorMessage = response.errors[0]?.message || "Une erreur inconnue est survenue.";
        throw new Error(errorMessage);
      }

      toast({
        title: "Réservation créée avec succès",
        description: "Votre réservation a été ajoutée.",
      });
    } catch (error) {
      console.error("Erreur Apollo Client:", error);
      toast({
        variant: "destructive",
        title: "Erreur lors de la création",
        description: (error as any).message || "Une erreur inconnue est survenue.",
      });
    } finally {
      setIsCreateDialogOpen(false);
      setIsCreating(false);
    }
  };

  const handleUpdateReservation = async () => {
    if (selectedReservation) {
        try {
            const response = await updateReservation({
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

  const handleDeleteReservation = async (selectedReservation: Reservation) => {
    if (selectedReservation) {
        try {
            const response = await deleteReservation({
                variables: {
                    id: selectedReservation.id,
                },
            });
            setIsReservationDialogOpen(false);
            toast({
                title: "Réservation supprimée avec succès!",
                description: `La réservation pour l'avion ${selectedReservation.aircraft.registration_number} a été supprimée.`,
            });
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Erreur lors de la suppression",
            description: "Une erreur est survenue lors de la suppression de la réservation.",
          });
        }
    }
  }


  const renderCalendarGrid = () => {
    if (!aircraftData || !reservationData) return null;

    return aircraftData.getAircrafts.map((aircraft: Aircraft) => {
      let skipHours = 0;

      return (
        <TableRow key={aircraft.id}>
          <TableCell className="text-sm font-semibold">{aircraft.registration_number}</TableCell>

          {hours.map((hour, index) => {
              if (
                isBefore(hour, new Date(`${formattedDate}T${settingsData?.getAdministrationSettings?.reservationStartTime}`)) ||
                isAfter(hour, new Date(`${formattedDate}T${settingsData?.getAdministrationSettings?.reservationEndTime}`))
              ) {
                return <TableCell key={index} className="bg-gray-200 cursor-not-allowed">-</TableCell>;
              }
            if (skipHours > 0) {
              skipHours--;
              return null;
            }

            const reservationForAircraft = reservationData.filteredReservations.find(
              (reservation: Reservation) =>
                reservation.aircraft.id === aircraft.id &&
                new Date(reservation.start_time) <= hour &&
                new Date(reservation.end_time) > hour
            );

            if (reservationForAircraft) {
              const durationHours = (new Date(reservationForAircraft.end_time).getTime() - new Date(reservationForAircraft.start_time).getTime()) / 3600000;
              const colSpan = Math.floor(durationHours);
              skipHours = colSpan - 1;

              return (
                <TableCell
                  key={index}
                  colSpan={colSpan}
                  className="text-center p-2 bg-red-500 text-white cursor-pointer"
                  onClick={() => handleReservationClick(reservationForAircraft)}
                >
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div className="p-1 rounded-md">Réservé</div>
                    </HoverCardTrigger>
                    <HoverCardContent>
                      <p>Avion : {aircraft.registration_number}</p>
                      <p>Utilisateur : {reservationForAircraft.user.first_name}</p>
                      <p>But : {reservationForAircraft.purpose}</p>
                      <p>Début : {format(new Date(reservationForAircraft.start_time), 'HH:mm')}</p>
                      <p>Fin : {format(new Date(reservationForAircraft.end_time), 'HH:mm')}</p>
                    </HoverCardContent>
                  </HoverCard>
                </TableCell>
              );
            } else {
              const isSelectedRange = selectedTimeRange.start &&
              selectedTimeRange.end &&
              selectedAircraft === aircraft.id &&
              format(hour, 'HH:mm') >= selectedTimeRange.start &&
              format(hour, 'HH:mm') <= selectedTimeRange.end;

            return (
              <TableCell
                key={index}
                className={`text-center p-2 cursor-pointer select-none ${isSelectedRange ? 'bg-teal-400' : ''}`}
                onMouseDown={() => handleMouseDown(aircraft.id, format(hour, 'HH:mm'))}
                onMouseEnter={() => handleMouseEnter(hour)}
                onMouseUp={handleMouseUp}
              >
                Libre
              </TableCell>
            );
            }
          })}
        </TableRow>
      );
    });
  };

  if (loadingReservations || loadingAircrafts) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }
  if (errorReservations || errorAircrafts) {
    toast({
      variant: "destructive",
      title: "Erreur lors de la récupération des données",
      description: "Une erreur est survenue lors de la récupération des réservations.",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 dark:text-white overflow-hidden">
      <h1 className="text-3xl font-bold mb-8">Calendrier des Réservations</h1>

      {isDayClosed() && (
        <div className="p-4 mb-4 bg-yellow-100 text-yellow-800 rounded-lg text-center">
          Votre aéroclub est fermé ce jour ({currentDate && format(currentDate, 'EEEE', { locale: fr })}).
        </div>
      )}

      <div className="flex items-center justify-between mb-8 w-full max-w-lg">
        <Button variant="outline" onClick={handlePreviousDay} className="flex items-center mr-4">
          <ArrowLeft className="mr-2" />
          Jour précédent
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !currentDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {currentDate ? format(currentDate, "PPP", { locale: fr }) : <span>Choisir une date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            locale={fr}
            selected={currentDate}
            onSelect={setCurrentDate}
            initialFocus
            disabled={(date) => {
              const dayName = format(date, 'EEEE', { locale: fr });
              return disabledDays.includes(dayName);
            }}
          />
          </PopoverContent>
        </Popover>

        <Button variant="outline" onClick={handleNextDay} className="flex items-center ml-4">
          Jour suivant
          <ArrowRight className="ml-2" />
        </Button>
      </div>

      <div className="flex justify-between mb-8 w-full max-w-lg">
        <Button onClick={handlePreviousWeek} variant="outline" className="mr-2">
          Semaine précédente
        </Button>
        <Button onClick={handleNextWeek} variant="outline">
          Semaine suivante
        </Button>
      </div>

      {!isDayClosed() && (
      <div className="overflow-x-auto w-full max-w-8xl shadow-lg rounded-lg border border-gray-300 dark:border-gray-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left p-2">Avion</TableHead>
              {hours.map((hour, index) => (
                <TableHead key={index} className="text-center p-2">
                  {format(hour, 'HH:mm')}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{renderCalendarGrid()}</TableBody>
        </Table>
      </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="p-6 rounded-md">
          <DialogTitle>Créer une réservation</DialogTitle>
          <div className="flex flex-col gap-4">
            <p>
              Avion :{' '}
              {selectedAircraft
                ? aircraftData.getAircrafts.find((a: Aircraft) => a.id === selectedAircraft)?.registration_number
                : ''}
            </p>
            <p>Heure de début : {selectedTimeRange.start}</p>
            <p>Heure de fin : {selectedTimeRange.end}</p>

            <Input
              placeholder="But de la réservation"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />

            <Input
              placeholder="Notes supplémentaires"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Select
              value={selectedCategoryFr}
              onValueChange={(value) => {
                setSelectedCategoryFr(value);
                setFlightCategory(flightCategoryReverseMapping[value]);
              }}
            >
              <SelectTrigger>
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

            <Button onClick={handleCreateReservation} disabled={isCreating}>
              {isCreating ? <Skeleton className="h-5 w-20" /> : "Créer la réservation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedReservation && (
        <Dialog open={isReservationDialogOpen} onOpenChange={setIsReservationDialogOpen}>
          <DialogContent className="p-6 rounded-md">
            <DialogTitle>Détails de la réservation</DialogTitle>
            <p>Avion : {selectedReservation.aircraft.registration_number}</p>
            <p>Utilisateur : {selectedReservation.user.first_name}</p>
            <p>Début : {format(new Date(selectedReservation.start_time), 'PPPPp', { locale: fr })}</p>
            <p>Fin : {format(new Date(selectedReservation.end_time), 'PPPPp', { locale: fr })}</p>

            <p>But : {selectedReservation.purpose}</p>
            <p>Notes : {selectedReservation.notes}</p>
            <p>Catégorie de vol : {selectedReservation.flight_category}</p>
            <p>Statut : {selectedReservation.status}</p>
            <p>Heures de vol estimées : {selectedReservation.estimated_flight_hours}</p>

            <div className="flex justify-end mt-4">
              <Button variant="outline" className="mr-2" onClick={ () => handleUpdate(selectedReservation) }>
                <Edit className="mr-2"/>
                Modifier
              </Button>
              <Button variant="outline" onClick={ () => handleDeleteReservation(selectedReservation)}>
                <Trash className="mr-2" />
                Supprimer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedReservation && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="p-6 rounded-md">
                  <DialogTitle>Modifier la réservation</DialogTitle>
                  <p>Avion : {selectedReservation.aircraft.registration_number}</p>
                  <p>Début : {format(new Date(selectedReservation.start_time), 'PPPPp', { locale: fr })}</p>
                  <p>Fin : {format(new Date(selectedReservation.end_time), 'PPPPp', { locale: fr })}</p>

                  <Label htmlFor="but">But de la réservation</Label>
                  <Input
                      id='but'
                      placeholder="But de la réservation"
                      value={editPurpose}
                      onChange={(e) => setEditPurpose(e.target.value)}
                      defaultValue={selectedReservation.purpose}
                  />
                  <Label htmlFor="note">Notes supplémentaires</Label>
                  <Input
                      placeholder="Notes supplémentaires"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      defaultValue={selectedReservation.notes}
                  />
                  <Label htmlFor="catégorie">Catégorie de vol</Label>
                    <Select
                      value={flightCategoryMapping[editFlightCategory as keyof typeof flightCategoryMapping]}
                      onValueChange={(value) => {
                        setEditFlightCategory(flightCategoryReverseMapping[value]);
                      }}
                    >
                      <SelectTrigger>
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

                  <div className="flex justify-end mt-4">
                      <Button onClick={handleUpdateReservation} className="mr-2">
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