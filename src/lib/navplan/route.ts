import type { LegInput, NavPoint, NavPointType, RoutePointInput, WindInput } from "./types"

// The route the pilot builds: departure, points, destination, and one leg between each pair.
// Invariant kept by every function here: legs.length === waypoints.length + 1.

export interface RoutePoint {
  /** Id of the nav point in our data; absent for a point placed by the pilot (USER). */
  navPointId?: string
  type: NavPointType
  ident: string
  name?: string | null
  lat: number
  lon: number
  /** The aerodrome of a VFR reporting point ("LFPN" for S), written before it. */
  aerodromeIcao?: string | null
}

export interface LegDraft {
  altitudeFt: number
  cruiseSetting?: string | null
  windOverride?: WindInput | null
}

export interface RouteDraft {
  departure: RoutePoint | null
  destination: RoutePoint | null
  alternate: RoutePoint | null
  waypoints: RoutePoint[]
  legs: LegDraft[]
}

export const DEFAULT_CRUISE_ALTITUDE_FT = 2500

export const emptyRoute = (altitudeFt = DEFAULT_CRUISE_ALTITUDE_FT): RouteDraft => ({
  departure: null,
  destination: null,
  alternate: null,
  waypoints: [],
  legs: [{ altitudeFt }],
})

export const routePointFromNavPoint = (point: NavPoint): RoutePoint => ({
  navPointId: point.type === "USER" ? undefined : point.id,
  type: point.type,
  ident: point.ident,
  name: point.name ?? null,
  lat: point.lat,
  lon: point.lon,
  ...(point.type === "VRP" && point.aerodromeIcao ? { aerodromeIcao: point.aerodromeIcao } : {}),
})

/** Next free name for a point placed on the map: P1, P2… */
export const nextUserPointName = (route: RouteDraft) => {
  const used = new Set(route.waypoints.filter((point) => point.type === "USER").map((point) => point.ident))
  let index = 1
  while (used.has(`P${index}`)) index += 1
  return `P${index}`
}

export const userPoint = (route: RouteDraft, lat: number, lon: number, name?: string): RoutePoint => {
  const ident = name?.trim() || nextUserPointName(route)
  return { type: "USER", ident, name: ident, lat: roundCoordinate(lat), lon: roundCoordinate(lon) }
}

// About 1 m: enough for a point placed by hand, and stable in the saved plan.
const roundCoordinate = (value: number) => Math.round(value * 1e5) / 1e5

const lastAltitude = (route: RouteDraft) => route.legs[route.legs.length - 1]?.altitudeFt ?? DEFAULT_CRUISE_ALTITUDE_FT

export const setDeparture = (route: RouteDraft, point: RoutePoint | null): RouteDraft => ({ ...route, departure: point })
export const setDestination = (route: RouteDraft, point: RoutePoint | null): RouteDraft => ({ ...route, destination: point })
export const setAlternate = (route: RouteDraft, point: RoutePoint | null): RouteDraft => ({ ...route, alternate: point })

/** Adds a point at the end of the route, before the destination; the new leg keeps the last altitude. */
export const appendWaypoint = (route: RouteDraft, point: RoutePoint): RouteDraft => ({
  ...route,
  waypoints: [...route.waypoints, point],
  legs: [...route.legs, { altitudeFt: lastAltitude(route) }],
})

/**
 * Inserts a point inside leg `legIndex` (0 = departure → first point). Both halves keep the
 * altitude and setting of the leg that was split.
 */
export const insertWaypoint = (route: RouteDraft, legIndex: number, point: RoutePoint): RouteDraft => {
  const index = clamp(legIndex, 0, route.waypoints.length)
  const split = route.legs[index] ?? { altitudeFt: lastAltitude(route) }
  const waypoints = [...route.waypoints]
  waypoints.splice(index, 0, point)
  const legs = [...route.legs]
  legs.splice(index + 1, 0, { altitudeFt: split.altitudeFt, cruiseSetting: split.cruiseSetting ?? null })
  return { ...route, waypoints, legs }
}

/** Removes point `index`: the leg towards it and the leg from it become one, at the altitude of the first. */
export const removeWaypoint = (route: RouteDraft, index: number): RouteDraft => {
  if (index < 0 || index >= route.waypoints.length) return route
  const waypoints = route.waypoints.filter((_, i) => i !== index)
  const legs = route.legs.filter((_, i) => i !== index + 1)
  return { ...route, waypoints, legs }
}

/** Moves point `from` to position `to` in the list; altitudes stay with the leg positions. */
export const reorderWaypoint = (route: RouteDraft, from: number, to: number): RouteDraft => {
  if (from === to || from < 0 || from >= route.waypoints.length) return route
  const target = clamp(to, 0, route.waypoints.length - 1)
  const waypoints = [...route.waypoints]
  const [moved] = waypoints.splice(from, 1)
  waypoints.splice(target, 0, moved)
  return { ...route, waypoints }
}

/**
 * The pilot dragged point `index` on the map: it is no longer the published point it was, so it
 * becomes a point of their own at the new position (keeping its name when it already was one).
 */
export const moveWaypoint = (route: RouteDraft, index: number, lat: number, lon: number): RouteDraft => {
  const current = route.waypoints[index]
  if (!current) return route
  const moved: RoutePoint =
    current.type === "USER"
      ? { ...current, lat: roundCoordinate(lat), lon: roundCoordinate(lon) }
      : userPoint(route, lat, lon)
  return { ...route, waypoints: route.waypoints.map((point, i) => (i === index ? moved : point)) }
}

export const renameWaypoint = (route: RouteDraft, index: number, name: string): RouteDraft => {
  const current = route.waypoints[index]
  if (!current || current.type !== "USER") return route
  const ident = name.trim().slice(0, 24)
  if (!ident) return route
  return { ...route, waypoints: route.waypoints.map((point, i) => (i === index ? { ...point, ident, name: ident } : point)) }
}

export const setLegAltitude = (route: RouteDraft, legIndex: number, altitudeFt: number): RouteDraft => ({
  ...route,
  legs: route.legs.map((leg, i) => (i === legIndex ? { ...leg, altitudeFt } : leg)),
})

export const setAllAltitudes = (route: RouteDraft, altitudeFt: number): RouteDraft => ({
  ...route,
  legs: route.legs.map((leg) => ({ ...leg, altitudeFt })),
})

export const setLegWind = (route: RouteDraft, legIndex: number, windOverride: WindInput | null): RouteDraft => ({
  ...route,
  legs: route.legs.map((leg, i) => (i === legIndex ? { ...leg, windOverride } : leg)),
})

export const setLegSetting = (route: RouteDraft, legIndex: number, cruiseSetting: string | null): RouteDraft => ({
  ...route,
  legs: route.legs.map((leg, i) => (i === legIndex ? { ...leg, cruiseSetting } : leg)),
})

/** Every point of the route in flying order (alternate excluded). */
export const routePoints = (route: RouteDraft): RoutePoint[] =>
  [route.departure, ...route.waypoints, route.destination].filter((point): point is RoutePoint => point !== null)

export const toRoutePointInput = (point: RoutePoint): RoutePointInput =>
  point.navPointId ? { navPointId: point.navPointId } : { lat: point.lat, lon: point.lon, name: point.ident }

export const toLegInputs = (route: RouteDraft): LegInput[] =>
  route.legs.map((leg) => ({
    altitudeFt: Math.round(leg.altitudeFt),
    cruiseSetting: leg.cruiseSetting ?? null,
    windOverride: leg.windOverride ?? null,
  }))

/**
 * Rebuilds the route of a saved plan. The saved input only holds ids: the points themselves come
 * from the legs of the saved result (from/to of each leg, and the alternate leg).
 */
export const routeFromSaved = (
  input: { waypoints: RoutePointInput[]; legs: LegInput[] },
  legs: { from: NavPoint; to: NavPoint }[],
  alternateLeg?: { to: NavPoint } | null,
): RouteDraft => {
  const points = legs.length > 0 ? [legs[0].from, ...legs.map((leg) => leg.to)] : []
  const toPoint = (point: NavPoint | undefined): RoutePoint | null => (point ? routePointFromNavPoint(point) : null)
  const waypoints = points.slice(1, -1).map(routePointFromNavPoint)
  const savedLegs = input.legs.length === waypoints.length + 1 ? input.legs : waypoints.map(() => input.legs[0]).concat(input.legs[0])
  return {
    departure: toPoint(points[0]),
    destination: points.length > 1 ? toPoint(points[points.length - 1]) : null,
    alternate: toPoint(alternateLeg?.to),
    waypoints,
    legs: savedLegs.map((leg) => ({
      altitudeFt: leg?.altitudeFt ?? DEFAULT_CRUISE_ALTITUDE_FT,
      cruiseSetting: leg?.cruiseSetting ?? null,
      windOverride: leg?.windOverride ?? null,
    })),
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * Coordinates typed in the search box: "48.7519 2.1061", "48.7519, -4.4185" or
 * "48°45'07\"N 002°06'22\"E" / "4845N 00206E" (degrees minutes). Null when it is not coordinates.
 */
export function parseCoordinates(text: string): { lat: number; lon: number } | null {
  const value = text.trim().toUpperCase()
  const decimal = value.match(/^(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/)
  if (decimal) {
    const lat = Number(decimal[1].replace(",", "."))
    const lon = Number(decimal[2].replace(",", "."))
    return validCoordinates(lat, lon)
  }
  const dms = value.match(
    /^(\d{1,2})[°\s]?(\d{1,2})?['\s]?(\d{1,2}(?:[.,]\d+)?)?"?\s*([NS])[\s,]*(\d{1,3})[°\s]?(\d{1,2})?['\s]?(\d{1,2}(?:[.,]\d+)?)?"?\s*([EWO])$/,
  )
  if (dms) {
    const toDegrees = (d: string, m?: string, s?: string) =>
      Number(d) + Number(m ?? 0) / 60 + Number((s ?? "0").replace(",", ".")) / 3600
    const lat = toDegrees(dms[1], dms[2], dms[3]) * (dms[4] === "S" ? -1 : 1)
    const lon = toDegrees(dms[5], dms[6], dms[7]) * (dms[8] === "E" ? 1 : -1)
    return validCoordinates(lat, lon)
  }
  return null
}

const validCoordinates = (lat: number, lon: number) =>
  Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null
