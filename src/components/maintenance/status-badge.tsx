import { Badge } from "@/components/ui/badge"

type MaintenanceStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

interface StatusBadgeProps {
  status: MaintenanceStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusBadgeVariant = (status: MaintenanceStatus) => {
    switch (status) {
      case "PLANNED":
        return "info"
      case "IN_PROGRESS":
        return "warning"
      case "COMPLETED":
        return "success"
      case "CANCELLED":
        return "danger"
      default:
        return "neutral"
    }
  }

  const getStatusLabel = (status: MaintenanceStatus) => {
    const statusMap = {
      PLANNED: "Planifiée",
      IN_PROGRESS: "En cours",
      COMPLETED: "Terminée",
      CANCELLED: "Annulée",
    }
    return statusMap[status] || status
  }

  return <Badge variant={getStatusBadgeVariant(status)}>{getStatusLabel(status)}</Badge>
}
