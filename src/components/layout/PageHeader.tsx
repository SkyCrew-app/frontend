import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Buttons shown on the right; the main action comes last. */
  actions?: ReactNode
  className?: string
}

/** The one page header of the app: title, optional one-line description, actions on the right. */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
