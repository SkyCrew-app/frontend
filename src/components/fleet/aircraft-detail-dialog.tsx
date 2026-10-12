"use client"

import type { ReactNode } from "react"
import { SidePanel } from "@/components/layout/SidePanel"
import { Button } from "@/components/ui/button"
import { ExternalLink, FileText, Pencil } from "lucide-react"
import type { Aircraft } from "@/interfaces/aircraft"
import { StatusBadge } from "./status-badge"
import { getBackendBaseUrl } from "@/lib/runtime-config"
import { aircraftFileName, aircraftFileUrl } from "@/lib/aircraft"
import { formatDecimal, formatFlightDuration, formatMoney } from "@/lib/format"

interface AircraftDetailDialogProps {
  aircraft: Aircraft | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Shown as the main action when the viewer may edit the aircraft. */
  onEdit?: (aircraft: Aircraft) => void
}

const hasValue = (value: number | string | null | undefined) => value !== null && value !== undefined && value !== ""

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium tabular-nums">{children}</dd>
    </div>
  )
}

export function AircraftDetailDialog({ aircraft, isOpen, onOpenChange, onEdit }: AircraftDetailDialogProps) {
  if (!aircraft) return null

  // Optional characteristics: only the ones filled in are listed.
  const characteristics = [
    { label: "Altitude maximale", value: aircraft.maxAltitude, unit: "ft" },
    { label: "Vitesse de croisière", value: aircraft.cruiseSpeed, unit: "kt" },
    { label: "Consommation", value: aircraft.consumption, unit: "L/h" },
    { label: "Capacité du réservoir", value: aircraft.fuel_capacity, unit: "L" },
    { label: "Carburant", value: aircraft.fuel_type, unit: "" },
    { label: "Masse à vide", value: aircraft.empty_weight, unit: "kg" },
    { label: "Masse maximale au décollage", value: aircraft.max_takeoff_weight, unit: "kg" },
  ].filter((item) => hasValue(item.value))

  const documents = aircraft.documents_url ?? []

  return (
    <SidePanel
      open={isOpen}
      onOpenChange={onOpenChange}
      title={aircraft.registration_number}
      description={aircraft.model}
      footer={
        onEdit ? (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button onClick={() => onEdit(aircraft)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Modifier
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={aircraft.availability_status} type="availability" />
          <StatusBadge status={aircraft.maintenance_status} type="maintenance" />
        </div>

        {aircraft.image_url && (
          // Aircraft files need the session: a plain image request carries it.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={aircraftFileUrl(getBackendBaseUrl(), aircraft.image_url)}
            alt={`${aircraft.model} ${aircraft.registration_number}`}
            className="max-h-48 w-full rounded-lg border object-cover"
          />
        )}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Informations générales</h3>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Fact label="Année">{aircraft.year_of_manufacture ?? "—"}</Fact>
            <Fact label="Heures de vol">
              {hasValue(aircraft.total_flight_hours) ? formatFlightDuration(aircraft.total_flight_hours) : "—"}
            </Fact>
            <Fact label="Coût horaire">{formatMoney(aircraft.hourly_cost)}</Fact>
          </dl>
        </section>

        {characteristics.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Caractéristiques</h3>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {characteristics.map((item) => (
                <Fact key={item.label} label={item.label}>
                  {typeof item.value === "number" ? formatDecimal(item.value) : item.value}
                  {item.unit ? ` ${item.unit}` : ""}
                </Fact>
              ))}
            </dl>
          </section>
        )}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Documents</h3>
          {documents.length > 0 ? (
            <ul className="space-y-2">
              {documents.map((url) => (
                <li key={url}>
                  <a
                    href={aircraftFileUrl(getBackendBaseUrl(), url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-muted"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{aircraftFileName(url)}</span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="sr-only">(nouvel onglet)</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun document pour cet aéronef.</p>
          )}
        </section>
      </div>
    </SidePanel>
  )
}
