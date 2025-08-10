'use client';

import { useQuery } from '@apollo/client';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { GET_FLIGHT_HISTORY } from '@/graphql/planes';
import { useToast } from '@/components/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, WrenchIcon, FilterIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslations } from 'next-intl';

export default function AircraftHistory() {
  const t = useTranslations('fleet');
  const { data, loading, error } = useQuery(GET_FLIGHT_HISTORY);
  const [currentPage, setCurrentPage] = useState<Record<string, number>>({});
  const [filters, setFilters] = useState<Record<string, any>>({});
  const itemsPerPage = 5;

  const { toast } = useToast();

  if (loading) return <Skeleton className="w-full h-[600px]" />;
  if (error) {
    toast({
      variant: "destructive",
      title: t('error'),
      description: t('historyError'),
    });
    return null;
  }

  if (!data || !data.getHistoryAircraft || data.getHistoryAircraft.length === 0) {
    return (
      <Card className="w-full max-w-3xl mx-auto mt-8">
        <CardContent className="text-center py-8">
          <p className="text-xl font-semibold">{t('notFound')}</p>
        </CardContent>
      </Card>
    );
  }

  const paginate = (items: any[], aircraftId: string, type: 'reservations' | 'maintenances') => {
    const page = currentPage[`${aircraftId}-${type}`] || 1;
    const startIndex = (page - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const handlePageChange = (aircraftId: string, type: 'reservations' | 'maintenances', newPage: number) => {
    setCurrentPage(prev => ({
      ...prev,
      [`${aircraftId}-${type}`]: newPage
    }));
  };

  const applyFilters = (items: any[], type: 'reservations' | 'maintenances') => {
    return items.filter(item => {
      if (type === 'reservations') {
        const startDate = filters[`${type}StartDate`] ? new Date(filters[`${type}StartDate`]) : null;
        const endDate = filters[`${type}EndDate`] ? new Date(filters[`${type}EndDate`]) : null;
        const userName = filters[`${type}UserName`]?.toLowerCase();

        return (!startDate || new Date(item.start_time) >= startDate) &&
               (!endDate || new Date(item.end_time) <= endDate) &&
               (!userName || `${item.user.first_name} ${item.user.last_name}`.toLowerCase().includes(userName));
      } else {
        const startDate = filters[`${type}StartDate`] ? new Date(filters[`${type}StartDate`]) : null;
        const endDate = filters[`${type}EndDate`] ? new Date(filters[`${type}EndDate`]) : null;
        const maintenanceType = filters[`${type}Type`]?.toLowerCase();

        return (!startDate || new Date(item.start_date) >= startDate) &&
               (!endDate || new Date(item.end_date) <= endDate) &&
               (!maintenanceType || item.maintenance_type.toLowerCase().includes(maintenanceType));
      }
    });
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">{t('historyTitle')}</h1>
      <div className="space-y-6">
        {data.getHistoryAircraft.map((aircraft: any) => (
          <Card key={aircraft.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-primary/10">
              <CardTitle className="flex items-center justify-between">
                <span>{aircraft.registration_number}</span>
                <Badge variant="secondary">{aircraft.model}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="reservations">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="reservations">{t('reservation')}</TabsTrigger>
                  <TabsTrigger value="maintenances">{t('inMaintenance')}</TabsTrigger>
                </TabsList>
                <TabsContent value="reservations">
                  <HistoryList
                    items={applyFilters(aircraft.reservations, 'reservations')}
                    aircraftId={aircraft.id}
                    type="reservations"
                    paginate={paginate}
                    handlePageChange={handlePageChange}
                    itemsPerPage={itemsPerPage}
                    filters={filters}
                    setFilters={setFilters}
                    renderItem={(reservation: any) => (
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {t('forTo', {
                            startDate: new Date(reservation.start_time).toLocaleDateString(),
                            endDate: new Date(reservation.end_time).toLocaleDateString()
                          })}
                        </span>
                        <Badge variant="outline">{reservation.user.first_name} {reservation.user.last_name}</Badge>
                      </div>
                    )}
                  />
                </TabsContent>
                <TabsContent value="maintenances">
                  <HistoryList
                    items={applyFilters(aircraft.maintenances, 'maintenances')}
                    aircraftId={aircraft.id}
                    type="maintenances"
                    paginate={paginate}
                    handlePageChange={handlePageChange}
                    itemsPerPage={itemsPerPage}
                    filters={filters}
                    setFilters={setFilters}
                    renderItem={(maintenance: any) => (
                      <div className="flex items-center space-x-2">
                        <WrenchIcon className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Du {new Date(maintenance.start_date).toLocaleDateString()} au {new Date(maintenance.end_date).toLocaleDateString()}
                        </span>
                        <Badge>{maintenance.maintenance_type}</Badge>
                        <Badge variant="outline">{maintenance.technician.first_name} {maintenance.technician.last_name}</Badge>
                      </div>
                    )}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function HistoryList({ items, aircraftId, type, paginate, handlePageChange, itemsPerPage, filters, setFilters, renderItem }: {
  items: any[];
  aircraftId: string;
  type: 'reservations' | 'maintenances';
  paginate: (items: any[], aircraftId: string, type: 'reservations' | 'maintenances') => any[];
  handlePageChange: (aircraftId: string, type: 'reservations' | 'maintenances', newPage: number) => void;
  itemsPerPage: number;
  filters: Record<string, any>;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  renderItem: (item: any) => React.ReactNode;
}) {
  const t = useTranslations('fleet');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const paginatedItems = paginate(items, aircraftId, type);
  const totalPages = Math.ceil(items.length / itemsPerPage);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev: Record<string, any>) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <FilterIcon className="h-4 w-4 mr-2" />
              {t('filters')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">{t('filters')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('filterDescription')}
                </p>
              </div>
              <div className="grid gap-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor={`${type}StartDate`}>{t('start')}</Label>
                  <Input
                    id={`${type}StartDate`}
                    type="date"
                    className="col-span-2 h-8"
                    value={filters[`${type}StartDate`] || ''}
                    onChange={(e) => handleFilterChange(`${type}StartDate`, e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor={`${type}EndDate`}>{t('end')}</Label>
                  <Input
                    id={`${type}EndDate`}
                    type="date"
                    className="col-span-2 h-8"
                    value={filters[`${type}EndDate`] || ''}
                    onChange={(e) => handleFilterChange(`${type}EndDate`, e.target.value)}
                  />
                </div>
                {type === 'reservations' ? (
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor={`${type}UserName`}>{t('user')}</Label>
                    <Input
                      id={`${type}UserName`}
                      type="text"
                      className="col-span-2 h-8"
                      value={filters[`${type}UserName`] || ''}
                      onChange={(e) => handleFilterChange(`${type}UserName`, e.target.value)}
                      placeholder={t('userName')}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor={`${type}Type`}>{t('type')}</Label>
                    <Input
                      id={`${type}Type`}
                      type="text"
                      className="col-span-2 h-8"
                      value={filters[`${type}Type`] || ''}
                      onChange={(e) => handleFilterChange(`${type}Type`, e.target.value)}
                      placeholder={t('maintenanceType')}
                    />
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <ScrollArea className="h-[300px] w-full rounded-md border p-4">
        {paginatedItems.length > 0 ? (
          <ul className="space-y-4">
            {paginatedItems.map((item: any) => (
              <li key={item.id} className="border-b pb-2 last:border-b-0">
                {renderItem(item)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-muted-foreground">{t('noElements')}</p>
        )}
      </ScrollArea>
      {items.length > itemsPerPage && (
        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(aircraftId, type, currentPage > 1 ? currentPage - 1 : 1)}
            disabled={currentPage === 1}
          >
            {t('previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('pageOn', {currentPage: currentPage, totalPages: totalPages})}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(aircraftId, type, currentPage < totalPages ? currentPage + 1 : currentPage)}
            disabled={currentPage >= totalPages}
          >
            {t('next')}
          </Button>
        </div>
      )}
    </div>
  );
}
