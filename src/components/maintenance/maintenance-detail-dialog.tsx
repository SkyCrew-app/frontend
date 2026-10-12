"use client"

import { useState, useEffect, type ReactNode } from "react"
import { ExternalLink, FileText, Pencil, Trash2 } from "lucide-react"
import { getBackendBaseUrl } from "@/lib/runtime-config"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import type { CarouselApi } from "@/components/ui/carousel"
import { StatusBadge } from "./status-badge"
import { MaintenanceTypeIcon } from "./maintenance-type-icon"
import type { Maintenance } from "@/interfaces/maintenance"
import { maintenanceFileName, maintenanceFileUrl } from "@/lib/maintenance"
import { formatDate, formatMoney } from "@/lib/format"

interface MaintenanceDetailDialogProps {
  maintenance: Maintenance | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (maintenance: Maintenance) => void
  /** Asks for the deletion; the page confirms it. */
  onDelete: (maintenance: Maintenance) => void
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  )
}

export function MaintenanceDetailDialog({
  maintenance,
  isOpen,
  onOpenChange,
  onEdit,
  onDelete,
}: MaintenanceDetailDialogProps) {
  const [api, setApi] = useState<CarouselApi | undefined>(undefined)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [imageCount, setImageCount] = useState(0)

  useEffect(() => {
    if (!api) return
    setImageCount(api.scrollSnapList().length)
    setCurrentImageIndex(api.selectedScrollSnap() + 1)

    api.on("select", () => {
      setCurrentImageIndex(api.selectedScrollSnap() + 1)
    })
  }, [api])

  if (!maintenance) return null

  const images = maintenance.images_url ?? []
  const documents = maintenance.documents_url ?? []
  const registration = maintenance.aircraft.registration_number

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Maintenance de {registration}</DialogTitle>
          <DialogDescription>{maintenance.aircraft.model}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Fact label="Type">
              <MaintenanceTypeIcon type={maintenance.maintenance_type} />
            </Fact>
            <Fact label="Statut">
              <StatusBadge status={maintenance.status} />
            </Fact>
            <Fact label="Coût">
              <span className="tabular-nums">
                {maintenance.maintenance_cost ? formatMoney(maintenance.maintenance_cost) : "—"}
              </span>
            </Fact>
            <Fact label="Début">{formatDate(maintenance.start_date)}</Fact>
            <Fact label="Fin">{formatDate(maintenance.end_date)}</Fact>
            <Fact label="Technicien">
              {maintenance.technician ? (
                <>
                  {maintenance.technician.first_name || maintenance.technician.email}
                  {maintenance.technician.first_name && (
                    <span className="block break-all text-xs font-normal text-muted-foreground">
                      {maintenance.technician.email}
                    </span>
                  )}
                </>
              ) : (
                <span className="font-normal text-muted-foreground">Non assigné</span>
              )}
            </Fact>
          </dl>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Description</h3>
            {maintenance.description ? (
              <p className="whitespace-pre-wrap text-sm">{maintenance.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune description.</p>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Pièces jointes</h3>
            {images.length === 0 && documents.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune pièce jointe.</p>
            )}

            {images.length > 0 && (
              <div className="space-y-2">
                <Carousel setApi={setApi} className="mx-auto w-full max-w-md">
                  <CarouselContent>
                    {images.map((url, index) => (
                      <CarouselItem key={url}>
                        <div className="overflow-hidden rounded-lg border">
                          {/* Maintenance files need the session: the image is requested with credentials. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={maintenanceFileUrl(getBackendBaseUrl(), url)}
                            crossOrigin="use-credentials"
                            alt={`Photo ${index + 1} de la maintenance de ${registration}`}
                            className="aspect-video h-auto w-full object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {images.length > 1 && (
                    <>
                      <CarouselPrevious aria-label="Image précédente" />
                      <CarouselNext aria-label="Image suivante" />
                    </>
                  )}
                </Carousel>
                {images.length > 1 && (
                  <p className="text-center text-xs text-muted-foreground tabular-nums" aria-live="polite">
                    Image {currentImageIndex} sur {imageCount}
                  </p>
                )}
              </div>
            )}

            {documents.length > 0 && (
              <ul className="space-y-2">
                {documents.map((url) => (
                  <li key={url}>
                    <a
                      href={maintenanceFileUrl(getBackendBaseUrl(), url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-muted"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1 break-all">{maintenanceFileName(url)}</span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="sr-only">(nouvel onglet)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(maintenance)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Supprimer
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button onClick={() => onEdit(maintenance)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Modifier
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
