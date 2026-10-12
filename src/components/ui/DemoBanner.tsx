"use client"

import { Eye } from "lucide-react"

export default function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null

  return (
    <div className="bg-brand text-brand-foreground px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 shrink-0">
      <Eye className="h-4 w-4" />
      Mode d&eacute;monstration &mdash; les modifications ne sont pas enregistr&eacute;es
    </div>
  )
}
