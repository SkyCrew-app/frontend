import { useEffect, useRef } from "react"
import { usePlan } from "@/components/hooks/usePlan"
import { reachedLimit, type PlanLimit } from "@/lib/plan"

/**
 * Whether the plan has room for one more aircraft or member: the number of places when they are
 * all used, null otherwise. `watch` sums up the list the page shows (ids and states): when it
 * changes (one added, retired, deactivated…) the counts are asked again.
 */
export function usePlanRoom(limit: PlanLimit, watch?: string): number | null {
  const { plan, refetch } = usePlan({ fresh: true })
  const seen = useRef(watch)
  useEffect(() => {
    if (watch === undefined) return
    const previous = seen.current
    seen.current = watch
    // The first list loaded is what the plan was just counted against.
    if (previous === undefined || previous === watch) return
    void refetch().catch(() => undefined)
  }, [watch, refetch])
  return reachedLimit(plan, limit)
}
