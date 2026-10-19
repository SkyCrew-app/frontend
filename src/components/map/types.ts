import type { CheckStatus, LegObstacle, NavPoint, NavPointType, ProfilePoint } from "@/lib/navplan/types"
import type { MapPoint } from "./layers/route"

// Kept apart from AeroMap.tsx so pages can type their props without loading the map library.

export interface AeroMapPoint extends MapPoint {
  ident: string
  type: NavPointType
  /** The aerodrome of a VFR reporting point, written before it ("LFPN S"). */
  aerodromeIcao?: string | null
}

export interface AeroMapProps {
  /** Route in flying order: departure, points, destination. */
  points: AeroMapPoint[]
  alternate?: AeroMapPoint | null
  profile?: ProfilePoint[]
  legDistancesNm?: number[]
  /** Written along each leg, e.g. "316° · 24 NM" (magnetic course and distance). */
  legLabels?: string[]
  /** Airspaces the route goes through, by id, with the worst status of their crossing: highlighted. */
  crossedAirspaces?: Record<string, CheckStatus>
  /** Obstacles the plan warns of (less than 500 ft under a leg): always drawn, in red. */
  warnedObstacles?: LegObstacle[]
  /** Click to add, drag to move, drag a leg handle to insert. */
  editable?: boolean
  onAddPoint?: (point: NavPoint | MapPoint) => void
  /** Index among the intermediate points (0 = first point after the departure). */
  onMoveWaypoint?: (waypointIndex: number, lat: number, lon: number) => void
  onInsertPoint?: (legIndex: number, lat: number, lon: number) => void
  className?: string
}

export const isNavPoint = (point: NavPoint | MapPoint): point is NavPoint => "id" in point && "type" in point
