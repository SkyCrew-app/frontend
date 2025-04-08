"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { CardTitle } from "@/components/ui/card"
import { CardHeader } from "@/components/ui/card"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DialogTitle } from "@/components/ui/dialog"
import { DialogHeader } from "@/components/ui/dialog"
import { DialogContent } from "@/components/ui/dialog"
import { Dialog } from "@/components/ui/dialog"
import {
  Edit,
  FileText,
  Plane,
  Clock,
  DollarSign,
  MapPin,
  Wind,
  Gauge,
  Fuel,
  CalendarClock,
  Download,
} from "lucide-react"
import Image from "next/image"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "framer-motion"

enum AvailabilityStatus {
  AVAILABLE = "AVAILABLE",
  UNAVAILABLE = "UNAVAILABLE",
  RESERVED = "RESERVED",
}

interface AircraftDetailsProps {
  aircraft: any
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
}

export function AircraftDetails({ aircraft, isOpen, onClose, onEdit }: AircraftDetailsProps) {
  const getStatusColor = (status: AvailabilityStatus) => {
    switch (status) {
      case AvailabilityStatus.AVAILABLE:
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      case AvailabilityStatus.UNAVAILABLE:
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
      case AvailabilityStatus.RESERVED:
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const getMaintenanceStatusColor = (status: string) => {
    if (status === "OK") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl">{aircraft.registration_number}</DialogTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{aircraft.model}</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant="outline"
                className={`${getStatusColor(aircraft.availability_status as AvailabilityStatus)} text-xs`}
              >
                {aircraft.availability_status === AvailabilityStatus.AVAILABLE
                  ? "Disponible"
                  : aircraft.availability_status === AvailabilityStatus.UNAVAILABLE
                    ? "Indisponible"
                    : "Réservé"}
              </Badge>
              <Badge variant="outline" className={`${getMaintenanceStatusColor(aircraft.maintenance_status)} text-xs`}>
                {aircraft.maintenance_status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 pt-4">
            <div className="relative h-40 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 sm:h-56 md:h-64">
              {aircraft.image_url ? (
                <Image
                  src={aircraft.image_url || "/placeholder.svg"}
                  alt={aircraft.model}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Plane className="h-16 w-16 text-gray-400 sm:h-20 sm:w-20 md:h-24 md:w-24" />
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2 px-4">
                  <CardTitle className="text-base sm:text-lg text-ellipsis">Informations générales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-4 text-sm">
                  <InfoItem
                    icon={<Plane className="h-4 w-4 text-primary" />}
                    label="Modèle"
                    value={aircraft.model}
                    className="max-w-full"
                  />
                  <InfoItem
                    icon={<Calendar className="h-4 w-4 text-primary" />}
                    label="Année de fabrication"
                    value={aircraft.year_of_manufacture.toString()}
                  />
                  <InfoItem
                    icon={<Clock className="h-4 w-4 text-primary" />}
                    label="Heures de vol totales"
                    value={`${aircraft.total_flight_hours}h`}
                  />
                  <InfoItem
                    icon={<DollarSign className="h-4 w-4 text-primary" />}
                    label="Coût horaire"
                    value={`${formatCurrency(aircraft.hourly_cost)}/h`}
                  />
                  {aircraft.current_location && (
                    <InfoItem
                      icon={<MapPin className="h-4 w-4 text-primary" />}
                      label="Localisation actuelle"
                      value={aircraft.current_location}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 px-4">
                  <CardTitle className="text-base sm:text-lg text-ellipsis">Caractéristiques techniques</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-4 text-sm">
                  {aircraft.maxAltitude && (
                    <InfoItem
                      icon={<Wind className="h-4 w-4 text-primary" />}
                      label="Altitude maximale"
                      value={`${aircraft.maxAltitude} ft`}
                    />
                  )}
                  {aircraft.cruiseSpeed && (
                    <InfoItem
                      icon={<Gauge className="h-4 w-4 text-primary" />}
                      label="Vitesse de croisière"
                      value={`${aircraft.cruiseSpeed} kt`}
                    />
                  )}
                  {aircraft.consumption && (
                    <InfoItem
                      icon={<Fuel className="h-4 w-4 text-primary" />}
                      label="Consommation"
                      value={`${aircraft.consumption} L/h`}
                    />
                  )}
                  {aircraft.last_inspection_date && (
                    <InfoItem
                      icon={<CalendarClock className="h-4 w-4 text-primary" />}
                      label="Dernière inspection"
                      value={formatDate(new Date(aircraft.last_inspection_date))}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="pt-4">
            {aircraft.documents_url && aircraft.documents_url.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-base font-medium sm:text-lg">Documents associés</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {aircraft.documents_url.map((doc: any, index: any) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <Card className="overflow-hidden">
                        <CardContent className="p-0">
                          <a
                            href={doc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 hover:bg-muted/50"
                          >
                            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="flex-1 truncate">
                              <p className="font-medium text-sm">Document {index + 1}</p>
                              <p className="truncate text-xs text-muted-foreground">{doc.split("/").pop()}</p>
                            </div>
                            <Download className="h-4 w-4 text-muted-foreground" />
                          </a>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed p-4 text-center sm:h-56">
                <div className="space-y-2">
                  <p className="text-base font-medium sm:text-lg">Aucun document</p>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Aucun document n'est associé à cet aéronef. Vous pouvez en ajouter en modifiant l'aéronef.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button onClick={onEdit} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Modifier l'aéronef
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// InfoItem component for consistent display of information
function InfoItem({
  icon,
  label,
  value,
  className = "",
}: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2 flex-shrink-0">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <span className="truncate max-w-[45%] text-right">{value}</span>
    </div>
  )
}

// Calendar icon component (since it's not in lucide-react by default)
function Calendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}
