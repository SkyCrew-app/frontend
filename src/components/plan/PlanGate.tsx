"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { usePlan } from "@/components/hooks/usePlan"
import { featureOfPage } from "@/lib/plan"
import { NotInPlan } from "./NotInPlan"

/**
 * A page the plan of the club leaves out (opened from an old link or a bookmark) says so instead
 * of failing on every request. Such a page waits for the plan rather than flashing errors.
 */
export function PlanGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { includes, settled } = usePlan()
  const feature = featureOfPage(pathname ?? "")
  if (!feature) return <>{children}</>
  if (!settled) return null
  return includes(feature) ? <>{children}</> : <NotInPlan />
}
