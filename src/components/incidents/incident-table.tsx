"use client"

import { AlertTriangle, Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/layout/EmptyState"
import { ListPagination } from "@/components/fleet/list-pagination"
import { formatDate } from "@/lib/format"
import {
  incidentCategoryLabel,
  incidentPersonName,
  incidentSeverity,
  incidentStatus,
  type Incident,
} from "@/lib/incident"

interface IncidentTableProps {
  /** Incidents of the current page. */
  incidents: Incident[]
  currentPage: number
  itemsPerPage: number
  totalItems: number
  onPageChange: (page: number) => void
  onSelectIncident: (incident: Incident) => void
  /** True when a search or a filter narrows the list. */
  hasFilters: boolean
  onResetFilters: () => void
}

export function IncidentTable({
  incidents,
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onSelectIncident,
  hasFilters,
  onResetFilters,
}: IncidentTableProps) {
  const { t } = useTranslation("administration")
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common:labels.date")}</TableHead>
              <TableHead>{t("incidents.fields.aircraft")}</TableHead>
              <TableHead>{t("common:labels.pilot")}</TableHead>
              <TableHead>{t("common:labels.category")}</TableHead>
              <TableHead>{t("incidents.fields.severity")}</TableHead>
              <TableHead>{t("common:labels.status")}</TableHead>
              <TableHead>{t("common:labels.description")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.length > 0 ? (
              incidents.map((incident) => {
                const severity = incidentSeverity(incident.severity_level)
                const status = incidentStatus(incident.status)
                return (
                  <TableRow
                    key={incident.id}
                    tabIndex={0}
                    aria-label={t("incidents.table.rowLabel", {
                      date: formatDate(incident.incident_date),
                      registration: incident.aircraft.registration_number,
                    })}
                    className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={() => onSelectIncident(incident)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        onSelectIncident(incident)
                      }
                    }}
                  >
                    <TableCell className="whitespace-nowrap">{formatDate(incident.incident_date)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{incident.aircraft.registration_number}</div>
                      {incident.aircraft.model && (
                        <div className="text-xs text-muted-foreground">{incident.aircraft.model}</div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{incidentPersonName(incident.user)}</TableCell>
                    <TableCell>{incidentCategoryLabel(incident.category)}</TableCell>
                    <TableCell>
                      <Badge variant={severity.variant} className="whitespace-nowrap">
                        {severity.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="whitespace-nowrap">
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate text-muted-foreground" title={incident.description}>
                        {incident.description || "—"}
                      </p>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="p-4">
                  {hasFilters ? (
                    <EmptyState
                      icon={Search}
                      title={t("incidents.table.noMatch.title")}
                      description={t("incidents.table.noMatch.description")}
                      action={
                        <Button variant="outline" onClick={onResetFilters}>
                          {t("incidents.table.resetFilters")}
                        </Button>
                      }
                      className="border-0"
                    />
                  ) : (
                    <EmptyState
                      icon={AlertTriangle}
                      title={t("incidents.table.empty.title")}
                      description={t("incidents.table.empty.description")}
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
        itemsLabel={t("incidents.table.itemsLabel", { count: totalItems })}
      />
    </div>
  )
}
