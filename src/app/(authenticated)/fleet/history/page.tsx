'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { endOfDay, startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { History, Search, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/layout/ErrorState';
import { EmptyState } from '@/components/layout/EmptyState';
import { ListPagination } from '@/components/fleet/list-pagination';
import { GET_FLIGHT_HISTORY } from '@/graphql/planes';
import { maintenanceTypeLabel } from '@/lib/maintenance';
import { formatDate, formatDateTime, formatFlightDuration } from '@/lib/format';
import i18n from '@/lib/i18n';

interface Person {
  first_name?: string | null;
  last_name?: string | null;
}

interface HistoryReservation {
  id: string | number;
  start_time: string;
  end_time: string;
  user?: Person | null;
}

interface HistoryMaintenance {
  id: string | number;
  maintenance_type?: string | null;
  start_date: string;
  end_date: string;
  technician?: Person | null;
}

interface HistoryAircraft {
  id: string | number;
  registration_number: string;
  model: string;
  reservations?: HistoryReservation[] | null;
  maintenances?: HistoryMaintenance[] | null;
}

interface HistoryData {
  getHistoryAircraft: HistoryAircraft[];
}

type HistoryTab = 'reservations' | 'maintenances';

const ITEMS_PER_PAGE = 5;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const fullName = (person?: Person | null) => [person?.first_name, person?.last_name].filter(Boolean).join(' ');

const time = (value: string) => new Date(value).getTime();

// Most recent first.
const byStartDesc = (a: string, b: string) => time(b) - time(a);

const maintenanceDuration = (start: string, end: string) => {
  const days = Math.max(1, Math.round((time(end) - time(start)) / DAY));
  return i18n.t('fleet:history.durationDays', { count: days });
};

export default function AircraftHistory() {
  const { t } = useTranslation('fleet');
  const { data, loading, error, refetch } = useQuery<HistoryData>(GET_FLIGHT_HISTORY);

  const [search, setSearch] = useState('');
  const [aircraftId, setAircraftId] = useState('all');
  const [period, setPeriod] = useState<DateRange | undefined>(undefined);
  // Current page of each list, keyed by aircraft and tab.
  const [pages, setPages] = useState<Record<string, number>>({});

  const aircrafts = data?.getHistoryAircraft ?? [];
  const term = search.trim().toLowerCase();
  const hasItemFilters = term !== '' || Boolean(period?.from || period?.to);
  const hasFilters = hasItemFilters || aircraftId !== 'all';

  // The filters apply to every aircraft: changing one brings each list back to its first page.
  const updateFilters = (update: () => void) => {
    update();
    setPages({});
  };

  const resetFilters = () =>
    updateFilters(() => {
      setSearch('');
      setAircraftId('all');
      setPeriod(undefined);
    });

  // An item is kept when it overlaps the chosen period.
  const inPeriod = (start: string, end: string) => {
    const from = period?.from ? startOfDay(period.from).getTime() : null;
    const to = period?.to ? endOfDay(period.to).getTime() : null;
    return (from === null || time(end) >= from) && (to === null || time(start) <= to);
  };

  const visibleAircrafts = aircrafts
    .filter((aircraft) => aircraftId === 'all' || String(aircraft.id) === aircraftId)
    .map((aircraft) => ({
      ...aircraft,
      reservations: (aircraft.reservations ?? [])
        .filter(
          (reservation) =>
            inPeriod(reservation.start_time, reservation.end_time) &&
            (!term || fullName(reservation.user).toLowerCase().includes(term)),
        )
        .sort((a, b) => byStartDesc(a.start_time, b.start_time)),
      maintenances: (aircraft.maintenances ?? [])
        .filter(
          (maintenance) =>
            inPeriod(maintenance.start_date, maintenance.end_date) &&
            (!term ||
              fullName(maintenance.technician).toLowerCase().includes(term) ||
              maintenanceTypeLabel(maintenance.maintenance_type).toLowerCase().includes(term)),
        )
        .sort((a, b) => byStartDesc(a.start_date, b.start_date)),
    }))
    // With a search or a period, aircraft without any match are left out.
    .filter((aircraft) => !hasItemFilters || aircraft.reservations.length > 0 || aircraft.maintenances.length > 0);

  const renderContent = () => {
    if (loading && !data) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-10 w-full sm:max-w-xl" />
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full" />
          ))}
        </div>
      );
    }

    if (error && !data) {
      return <ErrorState onRetry={() => refetch().catch(() => undefined)} />;
    }

    if (aircrafts.length === 0) {
      return (
        <EmptyState
          icon={History}
          title={t('shared.noAircraft')}
          description={t('history.emptyDescription')}
        />
      );
    }

    return (
      <>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder={t('history.searchPlaceholder')}
              aria-label={t('history.searchLabel')}
              value={search}
              onChange={(event) => updateFilters(() => setSearch(event.target.value))}
              className="pl-8"
            />
          </div>
          <Select value={aircraftId} onValueChange={(value) => updateFilters(() => setAircraftId(value))}>
            <SelectTrigger className="w-full sm:w-[220px]" aria-label={t('history.filterByAircraft')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('history.allAircraft')}</SelectItem>
              {aircrafts.map((aircraft) => (
                <SelectItem key={aircraft.id} value={String(aircraft.id)}>
                  {aircraft.registration_number} · {aircraft.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangePicker
            dateRange={period}
            onSelect={(range) => updateFilters(() => setPeriod(range))}
            placeholder={t('shared.allDates')}
            className="sm:w-[260px]"
          />
          {hasFilters && (
            <Button variant="ghost" onClick={resetFilters}>
              <X className="h-4 w-4" aria-hidden="true" />
              {t('common:actions.reset')}
            </Button>
          )}
        </div>

        {visibleAircrafts.length === 0 ? (
          <EmptyState
            icon={Search}
            title={t('common:states.noResults')}
            description={t('history.noMatchDescription')}
            action={
              <Button variant="outline" onClick={resetFilters}>
                {t('shared.resetFilters')}
              </Button>
            }
          />
        ) : (
          visibleAircrafts.map((aircraft) => {
            const pageOf = (tab: HistoryTab) => pages[`${aircraft.id}-${tab}`] ?? 1;
            const setPageOf = (tab: HistoryTab) => (page: number) =>
              setPages((previous) => ({ ...previous, [`${aircraft.id}-${tab}`]: page }));

            return (
              <Card key={aircraft.id} data-aircraft-card>
                <CardHeader>
                  <CardTitle>{aircraft.registration_number}</CardTitle>
                  <CardDescription>{aircraft.model}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="reservations">
                    <TabsList>
                      <TabsTrigger value="reservations">
                        {t('history.reservations.tab', { total: aircraft.reservations.length })}
                      </TabsTrigger>
                      <TabsTrigger value="maintenances">
                        {t('history.maintenances.tab', { total: aircraft.maintenances.length })}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="reservations">
                      <HistoryTable
                        items={aircraft.reservations}
                        page={pageOf('reservations')}
                        onPageChange={setPageOf('reservations')}
                        itemsLabel={(count) => t('pagination.items.reservation', { count })}
                        emptyMessage={
                          hasItemFilters
                            ? t('history.reservations.noMatch')
                            : t('history.reservations.empty')
                        }
                        head={
                          <>
                            <TableHead>{t('common:labels.start')}</TableHead>
                            <TableHead>{t('common:labels.end')}</TableHead>
                            <TableHead className="hidden text-right sm:table-cell">{t('common:labels.duration')}</TableHead>
                            <TableHead>{t('common:labels.pilot')}</TableHead>
                          </>
                        }
                        renderRow={(reservation) => (
                          <>
                            <TableCell>{formatDateTime(reservation.start_time)}</TableCell>
                            <TableCell>{formatDateTime(reservation.end_time)}</TableCell>
                            <TableCell className="hidden whitespace-nowrap text-right tabular-nums sm:table-cell">
                              {formatFlightDuration((time(reservation.end_time) - time(reservation.start_time)) / HOUR)}
                            </TableCell>
                            <TableCell>{fullName(reservation.user) || '—'}</TableCell>
                          </>
                        )}
                      />
                    </TabsContent>
                    <TabsContent value="maintenances">
                      <HistoryTable
                        items={aircraft.maintenances}
                        page={pageOf('maintenances')}
                        onPageChange={setPageOf('maintenances')}
                        itemsLabel={(count) => t('pagination.items.maintenance', { count })}
                        emptyMessage={
                          hasItemFilters
                            ? t('history.maintenances.noMatch')
                            : t('history.maintenances.empty')
                        }
                        head={
                          <>
                            <TableHead>{t('common:labels.type')}</TableHead>
                            <TableHead>{t('common:labels.start')}</TableHead>
                            <TableHead>{t('common:labels.end')}</TableHead>
                            <TableHead className="hidden text-right sm:table-cell">{t('common:labels.duration')}</TableHead>
                            <TableHead>{t('common:labels.technician')}</TableHead>
                          </>
                        }
                        renderRow={(maintenance) => (
                          <>
                            <TableCell className="font-medium">
                              {maintenanceTypeLabel(maintenance.maintenance_type)}
                            </TableCell>
                            <TableCell>{formatDate(maintenance.start_date)}</TableCell>
                            <TableCell>{formatDate(maintenance.end_date)}</TableCell>
                            <TableCell className="hidden whitespace-nowrap text-right tabular-nums sm:table-cell">
                              {maintenanceDuration(maintenance.start_date, maintenance.end_date)}
                            </TableCell>
                            <TableCell>
                              {fullName(maintenance.technician) || (
                                <span className="text-muted-foreground">{t('shared.unassigned')}</span>
                              )}
                            </TableCell>
                          </>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            );
          })
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={t('history.title')}
        description={t('history.description')}
      />
      {renderContent()}
    </div>
  );
}

interface HistoryTableProps<T extends { id: string | number }> {
  items: T[];
  page: number;
  onPageChange: (page: number) => void;
  /** Noun of what is listed, for a given number of items. */
  itemsLabel: (count: number) => string;
  emptyMessage: string;
  head: ReactNode;
  renderRow: (item: T) => ReactNode;
}

function HistoryTable<T extends { id: string | number }>({
  items,
  page,
  onPageChange,
  itemsLabel,
  emptyMessage,
  head,
  renderRow,
}: HistoryTableProps<T>) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pageItems = items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-3 pt-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>{head}</TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((item) => (
              <TableRow key={item.id}>{renderRow(item)}</TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ListPagination
        page={currentPage}
        pageSize={ITEMS_PER_PAGE}
        totalItems={items.length}
        onPageChange={onPageChange}
        itemsLabel={itemsLabel(items.length)}
      />
    </div>
  );
}
