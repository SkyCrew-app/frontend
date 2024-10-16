'use client';

import { gql, useQuery } from '@apollo/client';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';

const GET_MAINTENANCE = gql`
  query GetMaintenance {
    getAircrafts {
      id
      registration_number
      model
      maintenances {
        id
        status
        nextMaintenanceDate
      }
    }
  }
`;

export default function MaintenancePage() {
  const { data, loading, error } = useQuery(GET_MAINTENANCE);

  if (loading) return <p>Chargement des données...</p>;
  if (error) return <p>Erreur lors du chargement des données.</p>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className="text-3xl font-bold mb-8">Maintenance des Avions</h1>
      <div className="w-full max-w-6xl space-y-4">
        {data.getAircrafts.map((aircraft: any) => (
          <Card key={aircraft.id} className="shadow-md">
            <CardHeader>
              <CardTitle>{aircraft.registration_number} - {aircraft.model}</CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold">Maintenance :</h3>
              {aircraft.maintenances.length > 0 ? (
                <ul>
                  {aircraft.maintenances.map((maintenance: any) => (
                    <li key={maintenance.id}>
                      Statut : {maintenance.status}, Prochaine maintenance : {new Date(maintenance.nextMaintenanceDate).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Aucune maintenance programmée.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
