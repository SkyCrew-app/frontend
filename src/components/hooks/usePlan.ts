import { useQuery } from "@apollo/client"
import { GET_PLAN } from "@/graphql/plan"
import { planIncludes, type ClubPlan, type PlanFeature } from "@/lib/plan"

/**
 * The plan of the club. `plan` is null while it loads or when the API did not
 * answer; `includes` then says yes (see planIncludes).
 */
export function usePlan({ fresh = false }: { fresh?: boolean } = {}) {
  // `fresh`: also asks the API again, for the counts of aircraft and members.
  const { data, loading, error, refetch } = useQuery<{ plan: ClubPlan }>(GET_PLAN, {
    fetchPolicy: fresh ? "cache-and-network" : "cache-first",
  })
  const plan = data?.plan ?? null
  return {
    plan,
    // Known: loaded, or failed (then everything is shown).
    settled: !!plan || !!error || !loading,
    includes: (feature: PlanFeature) => planIncludes(plan, feature),
    refetch,
  }
}
