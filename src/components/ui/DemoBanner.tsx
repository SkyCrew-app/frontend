"use client"

import i18n from "@/lib/i18n"
import { Eye } from "lucide-react"

export default function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null

  return (
    // A landmark of its own, so that every part of the page belongs to one.
    <aside
      aria-label={i18n.t("common:states.demoMode")}
      className="bg-brand text-brand-foreground px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 shrink-0"
    >
      <Eye className="h-4 w-4" aria-hidden="true" />
      {i18n.t("common:states.demoMode")}
    </aside>
  )
}
