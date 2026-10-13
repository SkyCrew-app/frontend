"use client"

import { Eye, MoreHorizontal, Pencil, Plus, Search, Trash2, Wrench } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/layout/EmptyState"
import { ListPagination } from "@/components/fleet/list-pagination"
import { StatusBadge } from "./status-badge"
import { MaintenanceTypeIcon } from "./maintenance-type-icon"
import type { Maintenance } from "@/interfaces/maintenance"
import { formatDate, formatMoney } from "@/lib/format"
import { maintenanceTechnicianName } from "@/lib/maintenance"

interface MaintenanceTableProps {
  /** Maintenances of the current page. */
  maintenances: Maintenance[]
  currentPage: number
  itemsPerPage: number
  totalItems: number
  onPageChange: (page: number) => void
  onSelectMaintenance: (maintenance: Maintenance) => void
  onEditMaintenance: (maintenance: Maintenance) => void
  onDeleteMaintenance: (maintenance: Maintenance) => void
  /** True when a search or a filter narrows the list. */
  hasFilters: boolean
  onResetFilters: () => void
  onCreateMaintenance: () => void
}

export function MaintenanceTable({
  maintenances,
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onSelectMaintenance,
  onEditMaintenance,
  onDeleteMaintenance,
  hasFilters,
  onResetFilters,
  onCreateMaintenance,
}: MaintenanceTableProps) {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aéronef</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Période</TableHead>
              <TableHead>Technicien</TableHead>
              <TableHead className="text-right">Coût</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {maintenances.length > 0 ? (
              maintenances.map((maintenance) => (
                <TableRow
                  key={maintenance.id}
                  className="cursor-pointer"
                  onClick={() => onSelectMaintenance(maintenance)}
                >
                  <TableCell>
                    <div className="font-medium">{maintenance.aircraft.registration_number}</div>
                    <div className="text-xs text-muted-foreground">{maintenance.aircraft.model}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <MaintenanceTypeIcon type={maintenance.maintenance_type} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={maintenance.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div>{formatDate(maintenance.start_date)}</div>
                    <div className="text-xs text-muted-foreground">au {formatDate(maintenance.end_date)}</div>
                  </TableCell>
                  <TableCell>
                    {maintenance.technician ? (
                      <>
                        <div>{maintenanceTechnicianName(maintenance.technician)}</div>
                        {(maintenance.technician.first_name || maintenance.technician.last_name) && (
                          <div className="text-xs text-muted-foreground">{maintenance.technician.email}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Non assigné</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    {maintenance.maintenance_cost ? formatMoney(maintenance.maintenance_cost) : "—"}
                  </TableCell>
                  {/* The menu lives in the row: its clicks must not open the detail view. */}
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          aria-label={`Actions pour la maintenance de ${maintenance.aircraft.registration_number}`}
                          title="Actions"
                        >
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onSelect={() => onSelectMaintenance(maintenance)}>
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          Voir le détail
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2" onSelect={() => onEditMaintenance(maintenance)}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-destructive focus:text-destructive"
                          onSelect={() => onDeleteMaintenance(maintenance)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="p-4">
                  {hasFilters ? (
                    <EmptyState
                      icon={Search}
                      title="Aucune maintenance ne correspond"
                      description="Modifiez la recherche ou les filtres."
                      action={
                        <Button variant="outline" onClick={onResetFilters}>
                          Réinitialiser les filtres
                        </Button>
                      }
                      className="border-0"
                    />
                  ) : (
                    <EmptyState
                      icon={Wrench}
                      title="Aucune maintenance"
                      description="Planifiez la première intervention sur un aéronef de la flotte."
                      action={
                        <Button onClick={onCreateMaintenance}>
                          <Plus className="h-4 w-4" aria-hidden="true" />
                          Nouvelle maintenance
                        </Button>
                      }
                      className="border-0"
                    />
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <ListPagination
        page={currentPage}
        pageSize={itemsPerPage}
        totalItems={totalItems}
        onPageChange={onPageChange}
        itemsLabel={totalItems > 1 ? "maintenances" : "maintenance"}
      />
    </div>
  )
}
