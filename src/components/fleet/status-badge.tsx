import { AlertTriangle, Calendar, CheckCircle, Info, Wrench } from "lucide-react"
import { AvailabilityStatus } from "@/interfaces/aircraft"
import { useTranslations } from "next-intl"

interface StatusBadgeProps {
  status: string
  type: "availability" | "maintenance"
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const t = useTranslations('fleet');
  if (type === "availability") {
    switch (status) {
      case AvailabilityStatus.AVAILABLE:
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            {t('available')}
          </div>
        )
      case AvailabilityStatus.UNAVAILABLE:
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            {t('maintenance')}
          </div>
        )
      case AvailabilityStatus.RESERVED:
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Calendar className="h-3.5 w-3.5 mr-1" />
            {t('reserved')}
          </div>
        )
      default:
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Info className="h-3.5 w-3.5 mr-1" />
            {status}
          </div>
        )
    }
  } else {
    switch (status) {
      case "OPERATIONAL":
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            {t('operational')}
          </div>
        )
      case "NEEDS_MAINTENANCE":
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            {t('requiresMaintenance')}
          </div>
        )
      case "IN_MAINTENANCE":
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <Wrench className="h-3.5 w-3.5 mr-1" />
            {t('maintenance')}
          </div>
        )
      default:
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Info className="h-3.5 w-3.5 mr-1" />
            {status}
          </div>
        )
    }
  }
}
