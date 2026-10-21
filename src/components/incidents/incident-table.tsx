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
      {/* Below desktop width each row is laid out as a card: nothing scrolls sideways. */}
      <Card className="overflow-hidden">
        <Table className="max-lg:block">
          <TableHeader className="max-lg:hidden">
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
          <TableBody className="max-lg:block">
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
                    className="cursor-pointer max-lg:flex max-lg:flex-wrap max-lg:items-center max-lg:gap-x-3 max-lg:gap-y-2 max-lg:p-4 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={() => onSelectIncident(incident)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        onSelectIncident(incident)
                      }
                    }}
                  >
                    <TableCell className="whitespace-nowrap max-lg:order-2 max-lg:p-0 max-lg:text-muted-foreground">
                      {formatDate(incident.incident_date)}
                    </TableCell>
                    <TableCell className="max-lg:order-1 max-lg:flex max-lg:basis-full max-lg:flex-wrap max-lg:items-baseline max-lg:gap-x-2 max-lg:p-0">
                      <div className="whitespace-nowrap font-medium">{incident.aircraft.registration_number}</div>
                      {incident.aircraft.model && (
                        <div className="text-xs text-muted-foreground">{incident.aircraft.model}</div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap max-lg:order-5 max-lg:p-0 max-lg:text-muted-foreground">
                      {incidentPersonName(incident.user)}
                    </TableCell>
                    <TableCell className="max-lg:order-5 max-lg:p-0 max-lg:text-muted-foreground">
                      {incidentCategoryLabel(incident.category)}
                    </TableCell>
                    <TableCell className="max-lg:order-3 max-lg:p-0">
                      <Badge variant={severity.variant} className="whitespace-nowrap">
                        {severity.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-lg:order-4 max-lg:p-0">
                      <Badge variant={status.variant} className="whitespace-nowrap">
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs max-lg:order-6 max-lg:max-w-none max-lg:basis-full max-lg:p-0">
                      <p className="line-clamp-2 break-words text-muted-foreground" title={incident.description}>
                        {incident.description || "—"}
                      </p>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow className="hover:bg-transparent max-lg:block">
                <TableCell colSpan={7} className="p-4 max-lg:block">
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
