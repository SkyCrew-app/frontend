'use client';

import { gql, useQuery } from '@apollo/client';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';

const GET_FLIGHT_HISTORY = gql`
  query GetFlightHistory {
    getAircrafts {
      id
      registration_number
      model
      reservations {
        id
        startDate
        endDate
      }
    }
  }
`;

export default function AircraftHistory() {
  const { data, loading, error } = useQuery(GET_FLIGHT_HISTORY);

  if (loading) return <p>Chargement des données...</p>;
  if (error) return <p>Erreur lors du chargement des données.</p>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className="text-3xl font-bold mb-8">Historique des Vols</h1>
      <div className="w-full max-w-6xl space-y-4">
        {data.getAircrafts.map((aircraft: any) => (
          <Card key={aircraft.id} className="shadow-md">
            <CardHeader>
              <CardTitle>{aircraft.registration_number} - {aircraft.model}</CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold">Historique des Réservations :</h3>
              {aircraft.reservations.length > 0 ? (
                <ul>
                  {aircraft.reservations.map((reservation: any) => (
                    <li key={reservation.id}>
                      Du {new Date(reservation.startDate).toLocaleDateString()} au {new Date(reservation.endDate).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Aucune réservation récente.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
