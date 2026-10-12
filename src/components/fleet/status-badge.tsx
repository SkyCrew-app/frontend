import { Badge } from "@/components/ui/badge"
import { aircraftAvailability, aircraftMaintenanceState } from "@/lib/aircraft"

interface StatusBadgeProps {
  status: string | null | undefined
  type: "availability" | "maintenance"
  className?: string
}

/** Availability or maintenance state of an aircraft, same wording and colour everywhere. */
export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const { label, variant } = type === "availability" ? aircraftAvailability(status) : aircraftMaintenanceState(status)
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}
