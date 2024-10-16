'use client';

import { gql, useQuery } from '@apollo/client';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';

const GET_AIRCRAFTS = gql`
  query GetAircrafts {
    getAircrafts {
      id
      registration_number
      model
      availability_status
      maintenance_status
    }
  }
`;

export default function AircraftStatus() {
  const { data, loading, error } = useQuery(GET_AIRCRAFTS);

  if (loading) return <p>Chargement des données...</p>;
  if (error) return <p>Erreur lors du chargement des données.</p>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className="text-3xl font-bold mb-8">État des Avions</h1>
      <div className="w-full max-w-6xl space-y-4">
        {data.getAircrafts.map((aircraft: any) => (
          <Card key={aircraft.id} className="shadow-md">
            <CardHeader>
              <CardTitle>{aircraft.registration_number} - {aircraft.model}</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>Disponibilité :</strong> {aircraft.availability_status}</p>
              <p><strong>État de Maintenance :</strong> {aircraft.maintenance_status}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
