'use client';

import { useQuery } from '@apollo/client';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useState } from 'react';
import { GET_FLIGHT_HISTORY } from '@/graphql/planes';
import { useToast } from '@/components/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function AircraftHistory() {
  const { data, loading, error } = useQuery(GET_FLIGHT_HISTORY, {
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible de charger l'historique des avions.",
      });
    }
  });
  const [reservationPage, setReservationPage] = useState(1);
  const [maintenancePage, setMaintenancePage] = useState(1);
  const itemsPerPage = 5;

  const { toast } = useToast();

  if (loading) return <Skeleton className='w-full h-64' />;
  if (error) {
    toast({
      variant: "destructive",
      title: "Erreur",
      description: "Impossible de charger les maintenances. Veuillez réessayer plus tard.",
    });
    return null;
  }

  if (!data || !data.getHistoryAircraft) {
    return <p>Aucun avion trouvé.</p>;
  }

  const paginate = (items: any[], page: number) => {
    const startIndex = (page - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className="text-3xl font-bold mb-8">Historique des Vols et Maintenances</h1>
      <div className="w-full max-w-6xl space-y-4">
        {data.getHistoryAircraft.map((aircraft: any) => (
          <Card key={aircraft.id} className="shadow-md">
            <CardHeader>
              <CardTitle>{aircraft.registration_number} - {aircraft.model}</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                {/* Historique des réservations */}
                <AccordionItem value="reservations">
                  <AccordionTrigger>Historique des Réservations</AccordionTrigger>
                  <AccordionContent>
                    {aircraft.reservations.length > 0 ? (
                      <ul>
                        {paginate(aircraft.reservations, reservationPage).map((reservation: any) => (
                          <li key={reservation.id}>
                            Du {new Date(reservation.start_time).toLocaleDateString()} au {new Date(reservation.end_time).toLocaleDateString()} - Réservé par {reservation.user.first_name} {reservation.user.last_name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Aucune réservation récente.</p>
                    )}
                    {/* Pagination pour les réservations */}
                    {aircraft.reservations.length > itemsPerPage && (
                      <div className="mt-2">
                        <button
                          onClick={() => setReservationPage(reservationPage > 1 ? reservationPage - 1 : 1)}
                          disabled={reservationPage === 1}
                          className="mr-2"
                        >
                          Précédent
                        </button>
                        <button
                          onClick={() =>
                            setReservationPage(
                              reservationPage < Math.ceil(aircraft.reservations.length / itemsPerPage)
                                ? reservationPage + 1
                                : reservationPage
                            )
                          }
                          disabled={reservationPage >= Math.ceil(aircraft.reservations.length / itemsPerPage)}
                        >
                          Suivant
                        </button>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Historique des maintenances */}
                <AccordionItem value="maintenances">
                  <AccordionTrigger>Historique des Maintenances</AccordionTrigger>
                  <AccordionContent>
                    {aircraft.maintenances.length > 0 ? (
                      <ul>
                        {paginate(aircraft.maintenances, maintenancePage).map((maintenance: any) => (
                          <li key={maintenance.id}>
                            Du {new Date(maintenance.start_date).toLocaleDateString()} au {new Date(maintenance.end_date).toLocaleDateString()} - {maintenance.maintenance_type} par {maintenance.technician.first_name} {maintenance.technician.last_name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Aucune maintenance récente.</p>
                    )}
                    {/* Pagination pour les maintenances */}
                    {aircraft.maintenances.length > itemsPerPage && (
                      <div className="mt-2">
                        <button
                          onClick={() => setMaintenancePage(maintenancePage > 1 ? maintenancePage - 1 : 1)}
                          disabled={maintenancePage === 1}
                          className="mr-2"
                        >
                          Précédent
                        </button>
                        <button
                          onClick={() =>
                            setMaintenancePage(
                              maintenancePage < Math.ceil(aircraft.maintenances.length / itemsPerPage)
                                ? maintenancePage + 1
                                : maintenancePage
                            )
                          }
                          disabled={maintenancePage >= Math.ceil(aircraft.maintenances.length / itemsPerPage)}
                        >
                          Suivant
                        </button>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
