"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
} from "@/components/ui/pagination"
import { ClockIcon, UserIcon } from "lucide-react"
import { StatusBadge } from "./status-badge"
import { MaintenanceTypeIcon } from "./maintenance-type-icon"
import type { Maintenance } from "@/interfaces/maintenance"
import { useTranslations } from "next-intl"

interface MaintenanceTableProps {
  maintenances: Maintenance[]
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  onPageChange: (page: number) => void
  onSelectMaintenance: (maintenance: Maintenance) => void
  maintenanceTypes: Record<string, string>
}

export function MaintenanceTable({
  maintenances,
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onSelectMaintenance,
  maintenanceTypes,
}: MaintenanceTableProps) {
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage + 1
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems)
  const t = useTranslations('fleet');

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('aircraft')}</TableHead>
              <TableHead>{t('type')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('period')}</TableHead>
              <TableHead>{t('technician')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {maintenances.length > 0 ? (
              maintenances.map((maintenance) => (
                <TableRow key={maintenance.id}>
                  <TableCell>
                    <div className="font-medium">{maintenance.aircraft.registration_number}</div>
                    <div className="text-sm text-muted-foreground">{maintenance.aircraft.model}</div>
                  </TableCell>
                  <TableCell>
                    <MaintenanceTypeIcon
                      type={maintenance.maintenance_type as any}
                      label={maintenanceTypes[maintenance.maintenance_type] || "N/A"}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={maintenance.status as any} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1 text-muted-foreground" aria-hidden="true" />
                      <div>
                        <div className="text-sm">{new Date(maintenance.start_date).toLocaleDateString("fr-FR")}</div>
                        <div className="text-sm text-muted-foreground">
                          → {new Date(maintenance.end_date).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {maintenance.technician ? (
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-1 text-muted-foreground" aria-hidden="true" />
                        <span>{maintenance.technician.email}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{t('noAssigned')}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectMaintenance(maintenance)}
                          aria-label={`Voir les détails de la maintenance pour ${maintenance.aircraft.registration_number}`}
                        >
                          {t('details')}
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <p>{t('noMaintenanceFound')}</p>
                    <p className="text-sm">{t('adjustMaintenanceFilters')}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t p-4">
        <div className="text-sm text-muted-foreground">
          {totalItems > 0 ? (
            <span>
              {t('itemCount', {
                indexOfFirstItem: indexOfFirstItem,
                indexOfLastItem: indexOfLastItem,
                totalItems: totalItems,
              })}
            </span>
          ) : (
            <span>{t('noMaintenanceFound')}</span>
          )}
        </div>
        {totalPages > 1 && (
          <Pagination aria-label={t('navigationMaintenancePage')}>
            <PaginationContent>
              <PaginationItem>
                {currentPage > 1 && (
                  <PaginationPrevious onClick={() => onPageChange(currentPage - 1)} aria-label="Page précédente" />
                )}
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, index) => (
                <PaginationItem key={index}>
                  <PaginationLink
                    onClick={() => onPageChange(index + 1)}
                    isActive={currentPage === index + 1}
                    aria-label={`Page ${index + 1}`}
                    aria-current={currentPage === index + 1 ? "page" : undefined}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                {currentPage < totalPages && (
                  <PaginationNext onClick={() => onPageChange(currentPage + 1)} aria-label="Page suivante" />
                )}
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardFooter>
    </Card>
  )
}
