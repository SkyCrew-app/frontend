"use client"

import { useState, useEffect, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { ExternalLink, FileText, Pencil, Trash2 } from "lucide-react"
import { getBackendBaseUrl } from "@/lib/runtime-config"
import { SidePanel } from "@/components/layout/SidePanel"
import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import type { CarouselApi } from "@/components/ui/carousel"
import { StatusBadge } from "./status-badge"
import { MaintenanceTypeIcon } from "./maintenance-type-icon"
import type { Maintenance } from "@/interfaces/maintenance"
import { maintenanceFileName, maintenanceFileUrl, maintenanceTechnicianName } from "@/lib/maintenance"
import { formatDate, formatMoney } from "@/lib/format"

interface MaintenanceDetailDialogProps {
  maintenance: Maintenance | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Edit and delete, with the cost: for administrators and technicians only. */
  onEdit?: (maintenance: Maintenance) => void
  /** Asks for the deletion; the page confirms it. */
  onDelete?: (maintenance: Maintenance) => void
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
  const { t } = useTranslation("fleet")
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
    <SidePanel
      open={isOpen}
      onOpenChange={onOpenChange}
      title={t("maintenance.detail.title", { registration })}
      description={maintenance.aircraft.model}
      footerStart={
        onDelete && (
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(maintenance)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t("common:actions.delete")}
          </Button>
        )
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common:actions.close")}
          </Button>
          {onEdit && (
            <Button onClick={() => onEdit(maintenance)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {t("common:actions.edit")}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Fact label={t("common:labels.type")}>
            <MaintenanceTypeIcon type={maintenance.maintenance_type} />
          </Fact>
          <Fact label={t("common:labels.status")}>
            <StatusBadge status={maintenance.status} />
          </Fact>
          {onEdit && (
            <Fact label={t("common:labels.cost")}>
              <span className="tabular-nums">
                {maintenance.maintenance_cost ? formatMoney(maintenance.maintenance_cost) : "—"}
              </span>
            </Fact>
          )}
          <Fact label={t("common:labels.start")}>{formatDate(maintenance.start_date)}</Fact>
          <Fact label={t("common:labels.end")}>{formatDate(maintenance.end_date)}</Fact>
          <Fact label={t("common:labels.technician")}>
            {maintenance.technician ? (
              <>
                {maintenanceTechnicianName(maintenance.technician)}
                {(maintenance.technician.first_name || maintenance.technician.last_name) && (
                  <span className="block break-all text-xs font-normal text-muted-foreground">
                    {maintenance.technician.email}
                  </span>
                )}
              </>
            ) : (
              <span className="font-normal text-muted-foreground">{t("shared.unassigned")}</span>
            )}
          </Fact>
        </dl>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("common:labels.description")}</h3>
          {maintenance.description ? (
            <p className="whitespace-pre-wrap text-sm">{maintenance.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("maintenance.detail.noDescription")}</p>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{t("shared.attachments")}</h3>
          {images.length === 0 && documents.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("maintenance.detail.noAttachments")}</p>
          )}

          {images.length > 0 && (
            <div className="space-y-2">
              <Carousel setApi={setApi} className="mx-auto w-full max-w-sm">
                <CarouselContent>
                  {images.map((url, index) => (
                    <CarouselItem key={url}>
                      <div className="overflow-hidden rounded-lg border">
                        {/* Maintenance files need the session: the image is requested with credentials. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={maintenanceFileUrl(getBackendBaseUrl(), url)}
                          crossOrigin="use-credentials"
                          alt={t("maintenance.detail.photoAlt", { index: index + 1, registration })}
                          className="aspect-video h-auto w-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {images.length > 1 && (
                  <>
                    <CarouselPrevious aria-label={t("maintenance.detail.previousImage")} />
                    <CarouselNext aria-label={t("maintenance.detail.nextImage")} />
                  </>
                )}
              </Carousel>
              {images.length > 1 && (
                <p className="text-center text-xs text-muted-foreground tabular-nums" aria-live="polite">
                  {t("maintenance.detail.imageOf", { current: currentImageIndex, total: imageCount })}
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
                    <span className="sr-only">{t("shared.newTab")}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SidePanel>
  )
}
