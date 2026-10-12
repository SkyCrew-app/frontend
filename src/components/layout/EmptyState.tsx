import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: ReactNode
  description?: ReactNode
  /** Usually the button that creates the first item. */
  action?: ReactNode
  className?: string
}

/** What a list, table or section shows when it has nothing to show. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
