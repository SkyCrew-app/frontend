'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
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
import { GET_AIRCRAFTS } from '@/graphql/planes';
import { Aircraft, AircraftData, AvailabilityStatus } from '@/interfaces/aircraft';

ChartJS.register(ArcElement, Tooltip, Legend);

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
    <div className="flex flex-col items-center justify-center bg-background">
      <h1 className="text-3xl font-bold mb-8">Dashboard de la Flotte</h1>

      <div className="flex justify-between space-x-4 w-full mb-8">
        <Card className="shadow-md w-full md:w-1/2 mb-4">
          <CardHeader>
            <CardTitle className='mx-auto'>Disponibilité des Avions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full md:w-[400px] mx-auto">
              {loading ? (
                <Skeleton className="w-full h-[400px]" />
              ) : (
                <Pie
                  data={{
                    labels: ['Disponible', 'Maintenance', 'Réservé'],
                    datasets: [
                      {
                        data: [
                          data?.getAircrafts.filter((a) => a.availability_status === AvailabilityStatus.AVAILABLE).length,
                          data?.getAircrafts.filter((a) => a.availability_status === AvailabilityStatus.UNAVAILABLE).length,
                          data?.getAircrafts.filter((a) => a.availability_status === AvailabilityStatus.RESERVED).length,
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

        <Card className="shadow-md w-full md:w-1/2 mb-4">
          <CardHeader>
            <CardTitle className='mx-auto'>Types de Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full md:w-[400px] mx-auto">
              {loading ? (
                <Skeleton className="w-full h-[400px]" />
              ) : (
                <Pie
                  data={{
                    labels: [
                      'Inspection',
                      'Réparation',
                      'Révision',
                      'Mise à jour logicielle',
                      'Nettoyage',
                      'Autre'
                    ],
                    datasets: [
                      {
                        data: [
                          data?.getAircrafts.filter((a) => a.maintenances?.some((m) => m.maintenance_type === 'INSPECTION')).length,
                          data?.getAircrafts.filter((a) => a.maintenances?.some((m) => m.maintenance_type === 'REPAIR')).length,
                          data?.getAircrafts.filter((a) => a.maintenances?.some((m) => m.maintenance_type === 'OVERHAUL')).length,
                          data?.getAircrafts.filter((a) => a.maintenances?.some((m) => m.maintenance_type === 'SOFTWARE_UPDATE')).length,
                          data?.getAircrafts.filter((a) => a.maintenances?.some((m) => m.maintenance_type === 'CLEANING')).length,
                          data?.getAircrafts.filter((a) => a.maintenances?.some((m) => m.maintenance_type === 'OTHER')).length,
                        ],
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#FF9F40', '#4BC0C0', '#9966FF'],
                        hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#FF9F40', '#4BC0C0', '#9966FF'],
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
          <div className="p-6 flex flex-col md:flex-row items-center justify-between">
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
