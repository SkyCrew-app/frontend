"use client"

import { useTranslation } from "react-i18next"
import Link from "next/link"
import { Gauge, Pencil, Plane, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/fleet/status-badge"
import type { Aircraft } from "@/interfaces/aircraft"
import { aircraftFileUrl, aircraftMaintenanceState } from "@/lib/aircraft"
import { formatFlightDuration, formatMoney } from "@/lib/format"
import { getBackendBaseUrl } from "@/lib/runtime-config"

interface AircraftCardProps {
  aircraft: Aircraft
  onEdit: (aircraft: Aircraft) => void
  onDelete: (aircraft: Aircraft) => void
  onViewDetails: (aircraft: Aircraft) => void
}

export function AircraftCard({ aircraft, onEdit, onDelete, onViewDetails }: AircraftCardProps) {
  const { t } = useTranslation("fleet")
  // "Opérationnel" goes without saying: the maintenance state is only shown when it needs attention.
  const needsAttention = aircraftMaintenanceState(aircraft.maintenance_status).variant !== "success"

  return (
    <Card data-aircraft-card className="flex h-full flex-col">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
          {aircraft.image_url ? (
            // Aircraft files need the session: a plain image request carries it.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={aircraftFileUrl(getBackendBaseUrl(), aircraft.image_url)}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Plane className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="whitespace-nowrap text-base font-semibold">{aircraft.registration_number}</h2>
          <p className="truncate text-sm text-muted-foreground">{aircraft.model}</p>
        </div>
        <StatusBadge status={aircraft.availability_status} type="availability" className="shrink-0" />
      </div>

      <dl className="grid grid-cols-3 gap-3 px-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{t("shared.year")}</dt>
          <dd className="font-medium tabular-nums">{aircraft.year_of_manufacture ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("shared.flightHours")}</dt>
          <dd className="font-medium tabular-nums">{formatFlightDuration(aircraft.total_flight_hours ?? 0)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("shared.hourlyCost")}</dt>
          <dd className="font-medium tabular-nums">{formatMoney(aircraft.hourly_cost)}</dd>
        </div>
      </dl>

      {needsAttention && (
        <div className="px-4 pt-3">
          <StatusBadge status={aircraft.maintenance_status} type="maintenance" />
        </div>
      )}

      {/* Two groups (look, change) that wrap as a whole on a narrow card. */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onViewDetails(aircraft)}>
            {t("common:actions.details")}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/administration/planes/${aircraft.id}/flight-data`}>
              <Gauge className="h-4 w-4" aria-hidden="true" />
              {t("navplan:aircraftData.cardAction")}
            </Link>
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(aircraft)}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            {t("common:actions.edit")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive"
            onClick={() => onDelete(aircraft)}
            aria-label={t("admin.deleteLabel", { registration: aircraft.registration_number })}
            title={t("common:actions.delete")}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
