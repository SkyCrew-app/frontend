import { ClipboardCheck, Cpu, Hammer, type LucideIcon, RefreshCw, Sparkles, Wrench } from "lucide-react"
import { maintenanceTypeLabel } from "@/lib/maintenance"
import { cn } from "@/lib/utils"

const ICONS: Record<string, LucideIcon> = {
  INSPECTION: ClipboardCheck,
  REPAIR: Hammer,
  OVERHAUL: RefreshCw,
  SOFTWARE_UPDATE: Cpu,
  CLEANING: Sparkles,
}

interface MaintenanceTypeIconProps {
  type: string | null | undefined
  className?: string
}

/** Type of a maintenance: its icon and its French label. */
export function MaintenanceTypeIcon({ type, className }: MaintenanceTypeIconProps) {
  const Icon = ICONS[(type ?? "").toUpperCase()] ?? Wrench

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      {maintenanceTypeLabel(type)}
    </span>
  )
}
