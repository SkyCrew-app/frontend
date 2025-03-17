import { AlertTriangleIcon, XCircleIcon, RefreshCwIcon, FileTextIcon, CheckCircleIcon, InfoIcon } from "lucide-react"

type MaintenanceType = "INSPECTION" | "REPAIR" | "OVERHAUL" | "SOFTWARE_UPDATE" | "CLEANING" | "OTHER"

interface MaintenanceTypeIconProps {
  type: MaintenanceType
  label: string
  className?: string
}

export function MaintenanceTypeIcon({ type, label, className = "" }: MaintenanceTypeIconProps) {
  const getIcon = (type: MaintenanceType) => {
    switch (type) {
      case "INSPECTION":
        return <AlertTriangleIcon className={`h-4 w-4 mr-1 ${className}`} aria-hidden="true" />
      case "REPAIR":
        return <XCircleIcon className={`h-4 w-4 mr-1 ${className}`} aria-hidden="true" />
      case "OVERHAUL":
        return <RefreshCwIcon className={`h-4 w-4 mr-1 ${className}`} aria-hidden="true" />
      case "SOFTWARE_UPDATE":
        return <FileTextIcon className={`h-4 w-4 mr-1 ${className}`} aria-hidden="true" />
      case "CLEANING":
        return <CheckCircleIcon className={`h-4 w-4 mr-1 ${className}`} aria-hidden="true" />
      default:
        return <InfoIcon className={`h-4 w-4 mr-1 ${className}`} aria-hidden="true" />
    }
  }

  return (
    <div className="flex items-center">
      {getIcon(type)}
      <span>{label}</span>
    </div>
  )
}
