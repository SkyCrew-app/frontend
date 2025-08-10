"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { CardFooter } from "@/components/ui/card"
import { CardContent } from "@/components/ui/card"
import { CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import Image from "next/image"
import { Plane, Clock, Gauge, Fuel, DollarSign, MapPin, Info, Edit, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { motion } from "framer-motion"

enum AvailabilityStatus {
  AVAILABLE = "AVAILABLE",
  UNAVAILABLE = "UNAVAILABLE",
  RESERVED = "RESERVED",
}

interface AircraftCardProps {
  aircraft: any
  onEdit: (aircraft: any) => void
  onDelete: (id: number) => void
  onViewDetails: (aircraft: any) => void
}

export function AircraftCard({ aircraft, onEdit, onDelete, onViewDetails }: AircraftCardProps) {
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card className="h-full w-full overflow-hidden transition-all hover:shadow-md">
        <div className="relative h-32 w-full overflow-hidden bg-gray-100 dark:bg-gray-800 sm:h-40">
          {aircraft.image_url ? (
            <Image
              src={aircraft.image_url || "/placeholder.svg"}
              alt={aircraft.model}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Plane className="h-12 w-12 text-gray-400 sm:h-16 sm:w-16" />
            </div>
          )}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1 max-w-[calc(100%-16px)]">
            <Badge
              variant="outline"
              className={`${getStatusColor(aircraft.availability_status as AvailabilityStatus)} text-xs whitespace-nowrap`}
            >
              {aircraft.availability_status === AvailabilityStatus.AVAILABLE
                ? "Disponible"
                : aircraft.availability_status === AvailabilityStatus.UNAVAILABLE
                  ? "Indisponible"
                  : "Réservé"}
            </Badge>
            <Badge
              variant="outline"
              className={`${getMaintenanceStatusColor(aircraft.maintenance_status)} text-xs whitespace-nowrap`}
            >
              {aircraft.maintenance_status}
            </Badge>
          </div>
        </div>

        <CardHeader className="p-3 pb-0">
          <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <h3 className="text-base font-bold truncate sm:text-lg">{aircraft.registration_number}</h3>
            <span className="text-xs text-muted-foreground truncate sm:text-sm">{aircraft.model}</span>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-2 gap-1 p-3 text-xs sm:gap-1.5 sm:text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-primary flex-shrink-0 sm:h-3.5 sm:w-3.5" />
            <span className="truncate">{aircraft.year_of_manufacture}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-primary flex-shrink-0 sm:h-3.5 sm:w-3.5" />
            <span className="truncate">{aircraft.total_flight_hours}h</span>
          </div>
          {aircraft.cruiseSpeed && (
            <div className="flex items-center gap-1">
              <Gauge className="h-3 w-3 text-primary flex-shrink-0 sm:h-3.5 sm:w-3.5" />
              <span className="truncate">{aircraft.cruiseSpeed} kt</span>
            </div>
          )}
          {aircraft.consumption && (
            <div className="flex items-center gap-1">
              <Fuel className="h-3 w-3 text-primary flex-shrink-0 sm:h-3.5 sm:w-3.5" />
              <span className="truncate">{aircraft.consumption} L/h</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-primary flex-shrink-0 sm:h-3.5 sm:w-3.5" />
            <span className="truncate">{formatCurrency(aircraft.hourly_cost)}/h</span>
          </div>
          {aircraft.current_location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-primary flex-shrink-0 sm:h-3.5 sm:w-3.5" />
              <span className="truncate">{aircraft.current_location}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between p-3 pt-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2 sm:h-8 sm:px-2.5"
            onClick={() => onViewDetails(aircraft)}
          >
            <Info className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Détails</span>
          </Button>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => onEdit(aircraft)}>
              <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="sr-only">Modifier</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(aircraft.id)}
            >
              <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="sr-only">Supprimer</span>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
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
