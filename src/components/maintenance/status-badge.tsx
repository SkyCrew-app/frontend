import { Badge } from "@/components/ui/badge"
import { maintenanceStatus } from "@/lib/maintenance"

interface StatusBadgeProps {
  status: string | null | undefined
}

/** Status of a maintenance, same wording and colour everywhere. */
export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, variant } = maintenanceStatus(status)
  return <Badge variant={variant}>{label}</Badge>
}
