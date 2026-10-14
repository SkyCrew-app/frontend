// The plan of the club, as the API gives it (query `plan`). The API refuses
// what the plan leaves out; the interface only hides it.

import { ROLE_INSTRUCTOR } from "@/lib/roles"

export type PlanName = "CLUB" | "ECOLE"
export type PlanFeature = "INSTRUCTION"

export interface ClubPlan {
  plan: PlanName
  features: PlanFeature[]
  /** Aircraft in service allowed; null: no limit. */
  maxAircraft: number | null
  aircraftInService: number
  /** Active members allowed; null: no limit. */
  maxMembers: number | null
  activeMembers: number
}

/** Pages that belong to a feature some plans leave out. */
const FEATURE_PAGES: Record<PlanFeature, readonly string[]> = {
  INSTRUCTION: ["/instruction", "/administration/e-learning"],
}

const isWithin = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`)

/**
 * Whether the plan includes a feature. While the plan is unknown (loading, or
 * the API did not answer) everything is shown, as before plans existed: the
 * API still refuses what the plan leaves out.
 */
export const planIncludes = (plan: ClubPlan | null | undefined, feature: PlanFeature): boolean =>
  !plan || plan.features.includes(feature)

/** The feature a page belongs to, or null for a page every plan has. */
export const featureOfPage = (pathname: string): PlanFeature | null => {
  for (const [feature, pages] of Object.entries(FEATURE_PAGES) as [PlanFeature, readonly string[]][]) {
    if (pages.some((page) => isWithin(pathname, page))) return feature
  }
  return null
}

/** Whether the plan lets the page at `pathname` be opened. */
export const planAllowsPage = (plan: ClubPlan | null | undefined, pathname: string): boolean => {
  const feature = featureOfPage(pathname)
  return feature === null || planIncludes(plan, feature)
}

/** "3 / 5", or "3" alone when there is no limit. */
export const usage = (used: number, max: number | null) => (max === null ? `${used}` : `${used} / ${max}`)

/** Whether every place of a limit is used (or more, after a change of plan). */
export const isFull = (used: number, max: number | null) => max !== null && used >= max

/**
 * The roles an administrator may give: without instruction in the plan, not the instructor role,
 * unless it is the member's current one (so that the picker still shows it).
 */
export function assignableRoles<T extends { role_name: string }>(
  plan: ClubPlan | null | undefined,
  roles: T[],
  currentRole?: string | null,
): T[] {
  if (planIncludes(plan, "INSTRUCTION")) return roles
  return roles.filter((role) => role.role_name !== ROLE_INSTRUCTOR || role.role_name === currentRole)
}
