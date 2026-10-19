import { AIRSPACE_STYLES } from "@/lib/navplan/status"
import type { Airspace, AirspaceType, CheckStatus, LegObstacle, Obstacle } from "@/lib/navplan/types"
import { CROSSED_STYLES } from "./airspaces"

// Activities the SIA publishes at a point (parachuting, aerobatics, winches, captive balloons,
// low-level overflight bans, model aircraft, drones) and the obstacles. Information layers, off by
// default: the ones the route meets are always drawn.

export const ACTIVITY_SOURCE = "aero-activities"
export const OBSTACLE_SOURCE = "aero-obstacles"
export const ACTIVITY_LAYERS = {
  ring: "aero-activities-ring",
  point: "aero-activities-point",
  label: "aero-activities-label",
} as const
export const OBSTACLE_LAYERS = {
  point: "aero-obstacles-point",
  label: "aero-obstacles-label",
} as const

export type ActivityGroup = "activities" | "model"

/** The two switches of the map: hazards to plan around, and the small model aircraft / drone fields. */
export const ACTIVITY_GROUPS: Record<ActivityGroup, AirspaceType[]> = {
  activities: ["PARACHUTING", "AEROBATICS", "WINCH", "BALLOON", "LOW_OVERFLIGHT"],
  model: ["MODEL_AIRCRAFT", "DRONE"],
}

const SYMBOLS: Partial<Record<AirspaceType, string>> = {
  PARACHUTING: "PJE",
  AEROBATICS: "VOL",
  WINCH: "TR",
  BALLOON: "BAL",
  LOW_OVERFLIGHT: "SUR",
  MODEL_AIRCRAFT: "AER",
  DRONE: "UAS",
}

export const isActivity = (type: AirspaceType) => type in SYMBOLS

const METRES_PER_NM = 1852
const EARTH_RADIUS_M = 6371008.8

/** A ring of the given radius around a point (spherical, enough for a few NM). */
export function ringAround(lat: number, lon: number, radiusNm: number, steps = 48): number[][] {
  const ring: number[][] = []
  const angular = (radiusNm * METRES_PER_NM) / EARTH_RADIUS_M
  const φ1 = (lat * Math.PI) / 180
  const λ1 = (lon * Math.PI) / 180
  for (let i = 0; i <= steps; i++) {
    const θ = (2 * Math.PI * i) / steps
    const φ2 = Math.asin(Math.sin(φ1) * Math.cos(angular) + Math.cos(φ1) * Math.sin(angular) * Math.cos(θ))
    const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(angular) * Math.cos(φ1), Math.cos(angular) - Math.sin(φ1) * Math.sin(φ2))
    ring.push([(λ2 * 180) / Math.PI, (φ2 * 180) / Math.PI])
  }
  return ring
}

/**
 * The activities at a point as map features: a dashed ring of the distance the plans look around
 * them and a labelled dot. Shown when their group is switched on, or when the route meets them.
 */
export function activityFeatures(airspaces: Airspace[], shown: Partial<Record<ActivityGroup, boolean>>, crossed: Record<string, CheckStatus> = {}) {
  const visibleTypes = new Set<AirspaceType>(
    (Object.keys(ACTIVITY_GROUPS) as ActivityGroup[]).filter((group) => shown[group]).flatMap((group) => ACTIVITY_GROUPS[group]),
  )
  const features = []
  for (const airspace of airspaces) {
    if (!isActivity(airspace.type) || !airspace.referencePoint) continue
    const status = crossed[airspace.id]
    if (!status && !visibleTypes.has(airspace.type)) continue
    const { lat, lon } = airspace.referencePoint
    const color = status ? CROSSED_STYLES[status].color : (AIRSPACE_STYLES[airspace.type] ?? AIRSPACE_STYLES.OTHER).color
    const properties = {
      id: airspace.id,
      type: airspace.type,
      color,
      crossed: status ?? "",
      label: `${SYMBOLS[airspace.type]} ${airspace.ceiling.label}`,
    }
    if (airspace.radiusNm) {
      features.push({
        type: "Feature" as const,
        id: `${airspace.id}-ring`,
        geometry: { type: "Polygon" as const, coordinates: [ringAround(lat, lon, airspace.radiusNm)] },
        properties,
      })
    }
    features.push({ type: "Feature" as const, id: airspace.id, geometry: { type: "Point" as const, coordinates: [lon, lat] }, properties })
  }
  return { type: "FeatureCollection" as const, features }
}

export function activityLayers() {
  return [
    {
      id: ACTIVITY_LAYERS.ring,
      type: "line",
      source: ACTIVITY_SOURCE,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "line-color": ["get", "color"], "line-width": ["case", ["!=", ["get", "crossed"], ""], 2.5, 1.2], "line-dasharray": [2, 2] },
    },
    {
      id: ACTIVITY_LAYERS.point,
      type: "circle",
      source: ACTIVITY_SOURCE,
      filter: ["==", ["geometry-type"], "Point"],
      paint: { "circle-radius": 4, "circle-color": ["get", "color"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 1 },
    },
    {
      id: ACTIVITY_LAYERS.label,
      type: "symbol",
      source: ACTIVITY_SOURCE,
      filter: ["==", ["geometry-type"], "Point"],
      minzoom: 8,
      layout: { "text-field": ["get", "label"], "text-size": 10, "text-offset": [0, 0.9], "text-anchor": "top", "text-font": ["Noto Sans Regular"] },
      paint: { "text-color": ["get", "color"], "text-halo-color": "#ffffff", "text-halo-width": 1.2 },
    },
  ]
}

const OBSTACLE_COLOR = "#7f1d1d"
const OBSTACLE_WARNING_COLOR = "#dc2626"

/**
 * Obstacles: those of the box (when switched on and zoomed in) and, always, the ones the plan warns
 * of (less than 500 ft under a leg), in red.
 */
export function obstacleFeatures(obstacles: Obstacle[], warned: LegObstacle[] = []) {
  const features = [
    ...obstacles.map((obstacle) => ({
      type: "Feature" as const,
      id: obstacle.ident,
      geometry: { type: "Point" as const, coordinates: [obstacle.lon, obstacle.lat] },
      properties: {
        ident: obstacle.ident,
        type: obstacle.type,
        amslFt: obstacle.amslFt,
        aglFt: obstacle.aglFt ?? null,
        color: OBSTACLE_COLOR,
        warned: false,
        label: `${obstacle.amslFt}`,
      },
    })),
    ...warned
      .filter((obstacle) => typeof obstacle.lat === "number" && typeof obstacle.lon === "number")
      .map((obstacle) => ({
        type: "Feature" as const,
        id: `warned-${obstacle.lat}-${obstacle.lon}`,
        geometry: { type: "Point" as const, coordinates: [obstacle.lon as number, obstacle.lat as number] },
        properties: {
          ident: obstacle.ident ?? "",
          type: obstacle.type,
          amslFt: obstacle.amslFt,
          aglFt: obstacle.aglFt ?? null,
          color: OBSTACLE_WARNING_COLOR,
          warned: true,
          label: `${obstacle.amslFt}${obstacle.count > 1 ? ` ×${obstacle.count}` : ""}`,
        },
      })),
  ]
  return { type: "FeatureCollection" as const, features }
}

export function obstacleLayers() {
  return [
    {
      id: OBSTACLE_LAYERS.point,
      type: "circle",
      source: OBSTACLE_SOURCE,
      paint: {
        "circle-radius": ["case", ["get", "warned"], 5, 3],
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1,
      },
    },
    {
      id: OBSTACLE_LAYERS.label,
      type: "symbol",
      source: OBSTACLE_SOURCE,
      minzoom: 10,
      layout: { "text-field": ["get", "label"], "text-size": 9, "text-offset": [0, 0.8], "text-anchor": "top", "text-font": ["Noto Sans Regular"] },
      paint: { "text-color": ["get", "color"], "text-halo-color": "#ffffff", "text-halo-width": 1.2 },
    },
  ]
}
