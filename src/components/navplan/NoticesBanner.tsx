"use client"

import { useTranslation } from "react-i18next"
import { AlertTriangle, Info, OctagonAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { formatDate } from "@/lib/format"
import type { NavdataInfo, Notice } from "@/lib/navplan/types"
import { cn } from "@/lib/utils"

// The Alert of the kit has no warning variant: same look as the warning badges.
export const WARNING_ALERT = "border-warning/50 bg-warning/10 [&>svg]:text-warning"

/** The mention every preparation screen and document carries (design § 2.13). */
export function PreparationDisclaimer({ className }: { className?: string }) {
  const { t } = useTranslation("navplan")
  return (
    <p className={cn("flex items-start gap-2 text-xs text-muted-foreground", className)}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{t("disclaimer.preparation")}</span>
    </p>
  )
}

/** Cycle of the aeronautical data and its source; orange and explicit when it is out of date. */
export function NavdataAge({ navdata, className }: { navdata: NavdataInfo | null | undefined; className?: string }) {
  const { t } = useTranslation("navplan")
  if (!navdata) return null
  // Values of the API without an SIA import (contract change 3).
  if (navdata.airac === "NONE") {
    return (
      <Alert className={cn(WARNING_ALERT, className)}>
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>{t("navdata.noneTitle")}</AlertTitle>
        <AlertDescription>{t("navdata.noneDescription")}</AlertDescription>
      </Alert>
    )
  }
  if (navdata.airac === "OURAIRPORTS") {
    return <p className={cn("text-xs text-muted-foreground", className)}>{t("navdata.aerodromesOnly", { source: navdata.source })}</p>
  }
  if (navdata.stale) {
    return (
      <Alert className={cn(WARNING_ALERT, className)}>
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>{t("navdata.staleTitle", { airac: navdata.airac, date: formatDate(navdata.effectiveFrom) })}</AlertTitle>
        <AlertDescription>{t("navdata.staleDescription")}</AlertDescription>
      </Alert>
    )
  }
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {t("navdata.current", {
        airac: navdata.airac,
        from: formatDate(navdata.effectiveFrom),
        to: formatDate(navdata.effectiveTo),
        source: navdata.source,
      })}
    </p>
  )
}

/** Notices of the computation (unvalidated aircraft, default QNH, errors), worst first. */
export function NoticesList({ notices }: { notices: Notice[] }) {
  const { t } = useTranslation("navplan")
  // The disclaimer is written by every screen itself (PreparationDisclaimer).
  const sorted = [...notices].filter((notice) => notice.code !== "DISCLAIMER").sort((a, b) => rank(b.status) - rank(a.status))
  if (sorted.length === 0) return null
  const blocking = sorted.filter((notice) => notice.status === "BLOCKING")
  const others = sorted.filter((notice) => notice.status === "WARNING")
  const information = sorted.filter((notice) => notice.status === "OK")
  return (
    <div className="space-y-3">
      {blocking.length > 0 && (
        <Alert variant="destructive">
          <OctagonAlert className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{t("notices.blockingTitle")}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {blocking.map((notice) => (
                <li key={`${notice.code}-${notice.message}`}>{notice.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {others.length > 0 && (
        <Alert className={WARNING_ALERT}>
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{t("notices.warningTitle")}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {others.map((notice) => (
                <li key={`${notice.code}-${notice.message}`}>{notice.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {information.length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {information.map((notice) => (
            <li key={`${notice.code}-${notice.message}`} className="flex items-start gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {notice.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const rank = (status: Notice["status"]) => (status === "BLOCKING" ? 2 : status === "WARNING" ? 1 : 0)
