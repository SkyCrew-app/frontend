import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import SkycrewLogo from "@/components/navigation/SkycrewLogo"
import LanguageToggle from "@/components/theme/LanguageToggle"

type Tone = "neutral" | "success" | "warning" | "danger"

const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
}

interface AuthCardProps {
  title: ReactNode
  /** One line under the title. */
  description?: ReactNode
  /** Optional pictogram above the title, for status pages. */
  icon?: LucideIcon
  tone?: Tone
  /** The form or the action buttons. */
  children?: ReactNode
  /** Secondary link under the card. */
  footer?: ReactNode
}

/** The one layout of every page shown outside the app: sign-in, password pages, status pages. */
export function AuthCard({ title, description, icon: Icon, tone = "neutral", children, footer }: AuthCardProps) {
  return (
    <main id="main-content" className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      {/* A visitor can choose the language before signing in. */}
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-md">
        <SkycrewLogo className="mx-auto mb-6 h-14 text-foreground" />
        <Card>
          <div className="space-y-1.5 p-6 text-center">
            {Icon && (
              <div className={cn("mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full", TONES[tone])}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
            )}
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {children && <div className="p-6 pt-0">{children}</div>}
        </Card>
        {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </main>
  )
}

/** Shown while a page of this family waits for what it needs to render. */
export function AuthCardSkeleton() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10" aria-busy="true">
      <div className="w-full max-w-md">
        <SkycrewLogo className="mx-auto mb-6 h-14 text-foreground" />
        <Card className="space-y-4 p-6">
          <Skeleton className="mx-auto h-6 w-1/2" />
          <Skeleton className="mx-auto h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>
    </main>
  )
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </Link>
  )
}

/** Validation message under a field; tie it to the input with `aria-describedby`. */
export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-destructive">
      {children}
    </p>
  )
}
