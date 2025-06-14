import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"

type MaintenanceStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

interface StatusBadgeProps {
  status: MaintenanceStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations('fleet');
  const getStatusBadgeVariant = (status: MaintenanceStatus) => {
    switch (status) {
      case "PLANNED":
        return "outline"
      case "IN_PROGRESS":
        return "secondary"
      case "COMPLETED":
        return "default"
      case "CANCELLED":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getStatusLabel = (status: MaintenanceStatus) => {
    const statusMap = {
      PLANNED: t('plannedMaintenances'),
      IN_PROGRESS: t('inProgress'),
      COMPLETED: t('completedMaintenances'),
      CANCELLED: t('cancelledMaintenances'),
    }
    return statusMap[status] || status
  }

  return <Badge variant={getStatusBadgeVariant(status)}>{getStatusLabel(status)}</Badge>
}
