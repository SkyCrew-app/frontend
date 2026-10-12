import { AlertTriangle, Calendar, CheckCircle, Info, Wrench } from "lucide-react"
import { AvailabilityStatus } from "@/interfaces/aircraft"

interface StatusBadgeProps {
  status: string
  type: "availability" | "maintenance"
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  if (type === "availability") {
    switch (status) {
      case AvailabilityStatus.AVAILABLE:
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Disponible
          </div>
        )
      case AvailabilityStatus.UNAVAILABLE:
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            En maintenance
          </div>
        )
      case AvailabilityStatus.RESERVED:
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info/15 text-info">
            <Calendar className="h-3.5 w-3.5 mr-1" />
            Réservé
          </div>
        )
      default:
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
            <Info className="h-3.5 w-3.5 mr-1" />
            {status}
          </div>
        )
    }
  } else {
    switch (status) {
      case "OPERATIONAL":
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Opérationnel
          </div>
        )
      case "NEEDS_MAINTENANCE":
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Maintenance requise
          </div>
        )
      case "IN_MAINTENANCE":
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/15 text-destructive">
            <Wrench className="h-3.5 w-3.5 mr-1" />
            En maintenance
          </div>
        )
      default:
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
            <Info className="h-3.5 w-3.5 mr-1" />
            {status}
          </div>
        )
    }
  }
}
