"use client"

import { useTranslation } from "react-i18next"
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
  /** Edit and delete: given to administrators and technicians only, with the costs. */
  onEditMaintenance?: (maintenance: Maintenance) => void
  onDeleteMaintenance?: (maintenance: Maintenance) => void
  /** True when a search or a filter narrows the list. */
  hasFilters: boolean
  onResetFilters: () => void
  /** Offered in the empty state when the viewer may plan one. */
  onCreateMaintenance?: () => void
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
  const { t } = useTranslation("fleet")
  // A pilot reads the maintenances; the costs and the actions belong to the staff.
  const canManage = Boolean(onEditMaintenance && onDeleteMaintenance)
  const columns = canManage ? 7 : 5
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("shared.aircraft")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("common:labels.type")}</TableHead>
              <TableHead>{t("common:labels.status")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("maintenance.table.period")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("common:labels.technician")}</TableHead>
              {canManage && (
                <>
                  <TableHead className="hidden text-right xl:table-cell">{t("common:labels.cost")}</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">{t("common:labels.actions")}</span>
                  </TableHead>
                </>
              )}
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
                  <TableCell className="hidden whitespace-nowrap sm:table-cell">
                    <MaintenanceTypeIcon type={maintenance.maintenance_type} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={maintenance.status} />
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap md:table-cell">
                    <div>{formatDate(maintenance.start_date)}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("maintenance.table.until", { date: formatDate(maintenance.end_date) })}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {maintenance.technician ? (
                      <>
                        <div>{maintenanceTechnicianName(maintenance.technician)}</div>
                        {(maintenance.technician.first_name || maintenance.technician.last_name) && (
                          <div className="text-xs text-muted-foreground">{maintenance.technician.email}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">{t("shared.unassigned")}</span>
                    )}
                  </TableCell>
                  {onEditMaintenance && onDeleteMaintenance && (
                    <>
                      <TableCell className="hidden whitespace-nowrap text-right tabular-nums xl:table-cell">
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
                              aria-label={t("maintenance.table.actionsFor", {
                                registration: maintenance.aircraft.registration_number,
                              })}
                              title={t("common:labels.actions")}
                            >
                              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2" onSelect={() => onSelectMaintenance(maintenance)}>
                              <Eye className="h-4 w-4" aria-hidden="true" />
                              {t("maintenance.table.viewDetail")}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onSelect={() => onEditMaintenance(maintenance)}>
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                              {t("common:actions.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 text-destructive focus:text-destructive"
                              onSelect={() => onDeleteMaintenance(maintenance)}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              {t("common:actions.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns} className="p-4">
                  {hasFilters ? (
                    <EmptyState
                      icon={Search}
                      title={t("maintenance.table.noMatchTitle")}
                      description={t("maintenance.table.noMatchDescription")}
                      action={
                        <Button variant="outline" onClick={onResetFilters}>
                          {t("shared.resetFilters")}
                        </Button>
                      }
                      className="border-0"
                    />
                  ) : (
                    <EmptyState
                      icon={Wrench}
                      title={t("maintenance.table.emptyTitle")}
                      description={t("maintenance.table.emptyDescription")}
                      action={
                        onCreateMaintenance && (
                          <Button onClick={onCreateMaintenance}>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            {t("shared.newMaintenance")}
                          </Button>
                        )
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
        itemsLabel={t("pagination.items.maintenance", { count: totalItems })}
      />
    </div>
  )
}
