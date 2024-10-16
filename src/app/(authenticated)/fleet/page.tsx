'use client';

import { useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Drawer, DrawerContent, DrawerOverlay } from '@/components/ui/drawer';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
} from '@/components/ui/pagination';

ChartJS.register(ArcElement, Tooltip, Legend);

const GET_AIRCRAFTS = gql`
  query GetAircrafts {
    getAircrafts {
      id
      registration_number
      model
      availability_status
      maintenance_status
      hourly_cost
      year_of_manufacture
      total_flight_hours
      image_url
      documents_url
    }
  }
`;

type Aircraft = {
  id: number;
  registration_number: string;
  model: string;
  availability_status: string;
  maintenance_status: string;
  hourly_cost: number;
  year_of_manufacture: number;
  total_flight_hours: number;
  image_url?: string;
  documents_url?: string[];
};

type AircraftData = {
  getAircrafts: Aircraft[];
};

export default function FleetDashboard() {
  const { data, loading, error } = useQuery<AircraftData>(GET_AIRCRAFTS);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAircrafts = data?.getAircrafts.slice(indexOfFirstItem, indexOfLastItem) || [];

  const totalPages = Math.ceil((data?.getAircrafts.length || 0) / itemsPerPage);

  const handleAircraftClick = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedAircraft(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => handlePageChange(i)}
            className={i === currentPage ? 'bg-slate-200 text-black' : ''}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return pageNumbers;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className="text-3xl font-bold mb-8">Dashboard de la Flotte</h1>

      <div className="flex justify-between space-x-4 w-full max-w-8xl mb-8">
        <Card className="shadow-md w-1/3">
          <CardHeader>
            <CardTitle className='mx-auto'>Disponibilité des Avions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-[400px] mx-auto">
              {loading ? (
                <Skeleton className="w-[400px] h-[400px]" />
              ) : (
                <Pie
                  data={{
                    labels: ['Disponible', 'Maintenance', 'Réservé'],
                    datasets: [
                      {
                        data: [
                          data?.getAircrafts.filter((a) => a.availability_status === 'available').length,
                          data?.getAircrafts.filter((a) => a.availability_status === 'maintenance').length,
                          data?.getAircrafts.filter((a) => a.availability_status === 'reserved').length,
                        ],
                        backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
                        hoverBackgroundColor: ['#66BB6A', '#FFD54F', '#E57373'],
                      },
                    ],
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md w-1/3">
          <CardHeader>
            <CardTitle className='mx-auto'>Types de Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-[400px] mx-auto">
              {loading ? (
                <Skeleton className="w-[400px] h-[400px]" />
              ) : (
                <Pie
                  data={{
                    labels: ['Corrective', 'Préventive', 'Inspection'],
                    datasets: [
                      {
                        data: [
                          data?.getAircrafts.filter((a) => a.maintenance_status === 'Corrective').length,
                          data?.getAircrafts.filter((a) => a.maintenance_status === 'Préventive').length,
                          data?.getAircrafts.filter((a) => a.maintenance_status === 'Inspection').length,
                        ],
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
                        hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
                      },
                    ],
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md w-1/3">
          <CardHeader>
            <CardTitle className='mx-auto'>Avions par Année de Fabrication</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-[400px] mx-auto">
              {loading ? (
                <Skeleton className="w-[400px] h-[400px]" />
              ) : (
                <Pie
                  data={{
                    labels: [
                      'Avant 2000',
                      '2000 - 2010',
                      '2011 - 2020',
                      '2021 - Présent',
                    ],
                    datasets: [
                      {
                        data: [
                          data?.getAircrafts.filter((a) => a.year_of_manufacture < 2000).length,
                          data?.getAircrafts.filter((a) => a.year_of_manufacture >= 2000 && a.year_of_manufacture <= 2010).length,
                          data?.getAircrafts.filter((a) => a.year_of_manufacture > 2010 && a.year_of_manufacture <= 2020).length,
                          data?.getAircrafts.filter((a) => a.year_of_manufacture > 2020).length,
                        ],
                        backgroundColor: ['#9C27B0', '#00BCD4', '#FF9800', '#4CAF50'],
                        hoverBackgroundColor: ['#BA68C8', '#26C6DA', '#FFB74D', '#66BB6A'],
                      },
                    ],
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full max-w-8xl">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Liste des Avions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="w-full h-56" />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell>Immatriculation</TableCell>
                      <TableCell>Modèle</TableCell>
                      <TableCell>Disponibilité</TableCell>
                      <TableCell>Maintenance</TableCell>
                      <TableCell>Coût Horaire (€)</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentAircrafts.map((aircraft) => (
                      <TableRow key={aircraft.id}>
                        <TableCell>{aircraft.registration_number}</TableCell>
                        <TableCell>{aircraft.model}</TableCell>
                        <TableCell>{aircraft.availability_status}</TableCell>
                        <TableCell>{aircraft.maintenance_status}</TableCell>
                        <TableCell>{aircraft.hourly_cost.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button onClick={() => handleAircraftClick(aircraft)}>Voir</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-center mt-4 space-x-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        {currentPage > 1 && (
                          <PaginationPrevious
                            onClick={() => handlePageChange(currentPage - 1)}
                          />
                        )}
                      </PaginationItem>
                      {renderPageNumbers()}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => {
                            if (currentPage < totalPages) {
                              handlePageChange(currentPage + 1);
                            }
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Drawer open={isDrawerOpen} onClose={closeDrawer}>
        <DrawerOverlay />
        <DrawerContent className="p-4 w-full h-1/2">
          <div className="p-6 flex flex-row items-center justify-between">
            {loading ? (
              <Skeleton className="w-full h-1/2" />
            ) : (
              <>
                <div className="flex-1 pr-6 space-y-4">
                  <h2 className="text-2xl font-bold">Détails de l'avion</h2>
                  <p><strong>Immatriculation :</strong> {selectedAircraft?.registration_number}</p>
                  <p><strong>Modèle :</strong> {selectedAircraft?.model}</p>
                  <p><strong>Disponibilité :</strong> {selectedAircraft?.availability_status}</p>
                  <p><strong>État de Maintenance :</strong> {selectedAircraft?.maintenance_status}</p>
                  <p><strong>Coût Horaire :</strong> {selectedAircraft?.hourly_cost} €</p>
                  <p><strong>Année de fabrication :</strong> {selectedAircraft?.year_of_manufacture}</p>
                  <p><strong>Heures de vol totales :</strong> {selectedAircraft?.total_flight_hours} heures</p>
                  </div>

                  <div className="flex-1 mt-4">
                    <h3 className="text-xl font-bold">Documents</h3>
                    {selectedAircraft?.documents_url?.length ? (
                      <ul className="list-disc list-inside mt-2">
                        {selectedAircraft.documents_url.map((url, index) => (
                          <li key={index}>
                            <a href={`http://localhost:3000${url}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                              Document {index + 1}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-600">Aucun document disponible</p>
                    )}
                  </div>

                <div className="flex-1 flex justify-center items-center">
                  {selectedAircraft?.image_url ? (
                    <img
                      src={`http://localhost:3000${selectedAircraft.image_url}`}
                      alt={selectedAircraft.model}
                      className="max-w-xs h-auto object-cover rounded-md shadow"
                    />
                  ) : (
                    <div className="w-48 h-32 bg-gray-300 flex items-center justify-center rounded-md shadow">
                      <span className="text-gray-600">Incoming</span>
                    </div>
                  )}
                </div>
              </>
            )}
            <Button className="absolute bottom-6 right-6" onClick={closeDrawer}>Fermer</Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
