"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"

interface WidgetContainerProps {
  title: string
  description?: ReactNode
  /** Shown on the right of the title: a "see all" link or an icon button. */
  action?: ReactNode
  children: ReactNode
}

/** The one frame of every dashboard widget: title on the left, action on the right, content below. */
export default function WidgetContainer({ title, description, action, children }: WidgetContainerProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex min-h-[3.75rem] flex-row items-center justify-between gap-3 space-y-0 p-5 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription className="mt-0.5 truncate text-xs">{description}</CardDescription>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </CardHeader>
      <CardContent className="flex-1 p-5 pt-0">{children}</CardContent>
    </Card>
  )
}

/** Header link of a widget, towards the page that shows everything. */
export function WidgetLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  )
}

export function WidgetListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface WidgetEmptyProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function WidgetEmpty({ icon, title, description, action }: WidgetEmptyProps) {
  return <EmptyState className="border-0 px-0 py-6" icon={icon} title={title} description={description} action={action} />
}

export function WidgetError({ onRetry }: { onRetry?: () => void }) {
  return <ErrorState description="Ces informations n'ont pas pu être chargées." onRetry={onRetry} />
}

interface WidgetRowProps {
  href: string
  icon: LucideIcon
  title: ReactNode
  meta?: ReactNode
  trailing?: ReactNode
}

/** One line of a widget list: icon, title, small meta line, optional badge on the right. */
export function WidgetRow({ href, icon: Icon, title, meta, trailing }: WidgetRowProps) {
  return (
    <Link
      href={href}
      className="-mx-2 flex min-h-[2.75rem] items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </Link>
  )
}
