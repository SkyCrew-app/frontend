'use client';

import { useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext, PaginationLink } from '@/components/ui/pagination';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Dialog, DialogTrigger, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, TriangleAlert } from 'lucide-react';
import { DateRange } from "react-day-picker";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { type CarouselApi } from "@/components/ui/carousel";

export const GET_ALL_MAINTENANCES = gql`
  query GetAllMaintenances {
    getAllMaintenances {
      id
      start_date
      end_date
      maintenance_type
      description
      maintenance_cost
      images_url
      documents_url
      aircraft {
        id
        registration_number
        model
      }
      technician {
        id
        first_name
        email
      }
    }
  }
`;

enum MaintenanceType {
  INSPECTION = 'Inspection',
  REPAIR = 'Réparation',
  OVERHAUL = 'Révision',
  SOFTWARE_UPDATE = 'Mise à jour logicielle',
  CLEANING = 'Nettoyage',
  OTHER = 'Autre',
}

type Maintenance = {
  id: number;
  start_date: Date;
  end_date: Date;
  maintenance_type: string;
  description: string;
  maintenance_cost: number;
  images_url?: string[];
  documents_url?: string[];
  aircraft: {
    id: number;
    registration_number: string;
    model: string;
  };
  technician?: {
    id: number;
    first_name: string;
    email: string;
  };
};

export default function MaintenanceTable() {
  const { data, loading, error } = useQuery(GET_ALL_MAINTENANCES);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTechnician, setFilterTechnician] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: undefined, to: undefined });
  const itemsPerPage = 5;

  const [api, setApi] = useState<CarouselApi | undefined>(undefined);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageCount, setImageCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    setImageCount(api.scrollSnapList().length);
    setCurrentImageIndex(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrentImageIndex(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  if (loading) return <Skeleton className="w-full h-64" />;
  if (error) return (
    <Alert variant="destructive">
      <TriangleAlert className="h-5 w-5 text-red-500 mr-2" />
      <div>
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>Impossible de charger les maintenances. Veuillez réessayer plus tard.</AlertDescription>
      </div>
    </Alert>
  );

  const maintenances: Maintenance[] = data?.getAllMaintenances || [];

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleTypeFilterChange = (value: string) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  const handleTechnicianFilterChange = (value: string) => {
    setFilterTechnician(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const filteredMaintenances = maintenances.filter((maintenance) => {
    const matchesSearchTerm =
      maintenance.aircraft.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      maintenance.aircraft.model.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || maintenance.maintenance_type === filterType;

    const matchesTechnician =
      filterTechnician === 'all' ||
      (maintenance.technician ? maintenance.technician.email : 'non_assigned') === filterTechnician;

    const matchesDate =
      (!dateRange || !dateRange.from || new Date(maintenance.start_date) >= dateRange.from) &&
      (!dateRange || !dateRange.to || new Date(maintenance.start_date) <= dateRange.to);

    return matchesSearchTerm && matchesType && matchesTechnician && matchesDate;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMaintenances = filteredMaintenances.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMaintenances.length / itemsPerPage);

  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-8">Liste des Maintenances</h1>

      <div className="mb-4 w-full max-w-3xl flex space-x-4">
        <Input
          placeholder="Rechercher par immatriculation ou modèle"
          value={searchTerm}
          onChange={handleSearchChange}
          className="flex-1"
        />

        {/* Dialog pour les filtres */}
        <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
          <DialogTrigger asChild>
            <Button>Ouvrir les filtres</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogClose />
            <h2 className="text-xl font-bold mb-4">Filtres</h2>
            <div className="space-y-4">
              <Select onValueChange={handleTypeFilterChange}>
          <SelectTrigger>Type de Maintenance</SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="Préventive">Préventive</SelectItem>
            <SelectItem value="Corrective">Corrective</SelectItem>
          </SelectContent>
              </Select>

              <Select onValueChange={handleTechnicianFilterChange}>
          <SelectTrigger>Technicien</SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Array.from(new Set(maintenances.map(m => m.technician?.email || 'non_assigned')))
              .filter(email => email && email !== '')
              .map(email => (
                <SelectItem key={email} value={email}>
            {email === 'non_assigned' ? 'Non assigné' : email}
                </SelectItem>
              ))}
          </SelectContent>
              </Select>

              {/* Date Picker */}
              <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange && dateRange.from ? (
                dateRange.to ? (
            <>
              {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
            </>
                ) : (
            format(dateRange.from, 'LLL dd, y')
                )
              ) : (
                <span>Sélectionnez une plage de dates</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(range) => {
                if (range?.from || range?.to) {
            setDateRange({ from: range?.from || undefined, to: range?.to || undefined });
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
              </Popover>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <Button onClick={() => setIsFilterDialogOpen(false)}>Valider</Button>
              <Button variant="outline" onClick={() => {
          setFilterType('all');
          setFilterTechnician('all');
          setDateRange({ from: undefined, to: undefined });
          setIsFilterDialogOpen(false);
              }}>Supprimer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Immatriculation</TableHead>
            <TableHead>Modèle</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date de fin</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentMaintenances.map((maintenance) => (
            <TableRow key={maintenance.id}>
              <TableCell>{maintenance.aircraft.registration_number}</TableCell>
              <TableCell>{maintenance.aircraft.model}</TableCell>
                <TableCell>{MaintenanceType[maintenance.maintenance_type as keyof typeof MaintenanceType] || 'N/A'}</TableCell>
              <TableCell>{new Date(maintenance.end_date).toLocaleDateString()}</TableCell>
              <TableCell>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button onClick={() => setSelectedMaintenance(maintenance)}>Voir plus</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg p-4">
                    <DialogClose />
                    {selectedMaintenance && (
                      <div>
                        <h3 className="text-xl font-bold mb-4">Détails de la Maintenance</h3>
                        <p><strong>Date :</strong> {new Date(selectedMaintenance.start_date).toLocaleDateString()} - {new Date(selectedMaintenance.end_date).toLocaleDateString()}</p>
                        <p><strong>Type :</strong> {MaintenanceType[selectedMaintenance.maintenance_type as keyof typeof MaintenanceType] || 'N/A'}</p>
                        <p><strong>Description :</strong> {selectedMaintenance.description || 'N/A'}</p>
                        <p><strong>Coût :</strong> {selectedMaintenance.maintenance_cost ? `${selectedMaintenance.maintenance_cost} €` : 'N/A'}</p>
                        <p><strong>Technicien :</strong> {selectedMaintenance.technician ? selectedMaintenance.technician.email : 'Non assigné'}</p>

                        {/* Accordions for Images and Documents */}
                        <Accordion type="single" collapsible>
                          <AccordionItem value="images">
                            <AccordionTrigger>Images</AccordionTrigger>
                            <AccordionContent>
                              {selectedMaintenance.images_url?.length ? (
                                <Carousel setApi={setApi}>
                                  <CarouselContent>
                                    {selectedMaintenance.images_url.map((url, index) => (
                                      <CarouselItem key={index}>
                                        <img
                                          src={`http://localhost:3000${url}`}
                                          alt={`Image ${index + 1}`}
                                          className="w-full h-auto mb-2"
                                        />
                                      </CarouselItem>
                                    ))}
                                  </CarouselContent>
                                  <CarouselPrevious />
                                  <CarouselNext />
                                </Carousel>
                              ) : (
                                <p>Aucune image disponible</p>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                          <AccordionItem value="documents">
                            <AccordionTrigger>Documents</AccordionTrigger>
                            <AccordionContent>
                              {selectedMaintenance.documents_url?.length ? (
                                selectedMaintenance.documents_url.map((url, index) => (
                                  <a key={index} href={`http://localhost:3000${url}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline block mb-2">
                                    Document {index + 1}
                                  </a>
                                ))
                              ) : (
                                <p>Aucun document disponible</p>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            {currentPage > 1 && (
              <PaginationPrevious
                onClick={() => handlePageChange(currentPage - 1)}
              />
            )}
          </PaginationItem>
          {Array.from({ length: totalPages }, (_, index) => (
            <PaginationItem key={index}>
              <PaginationLink
                onClick={() => handlePageChange(index + 1)}
                className={currentPage === index + 1 ? 'bg-slate-200 text-black' : ''}
              >
                {index + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            {currentPage < totalPages && (
              <PaginationNext
                onClick={() => handlePageChange(currentPage + 1)}
              />
            )}
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
