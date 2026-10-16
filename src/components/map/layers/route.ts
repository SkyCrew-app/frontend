import type { ProfilePoint } from "@/lib/navplan/types"

// The pilot's route: legs, alternate leg, and the TOC/TOD markers computed by the API.

export const ROUTE_SOURCE = "aero-route"
export const ROUTE_LAYERS = {
  casing: "aero-route-casing",
  line: "aero-route-line",
  alternate: "aero-route-alternate",
  markers: "aero-route-profile",
  markerLabels: "aero-route-profile-label",
} as const

export interface MapPoint {
  lat: number
  lon: number
}

export interface LegMidpoint extends MapPoint {
  /** Leg index: 0 = departure → first point. */
  legIndex: number
}

export const legMidpoints = (points: MapPoint[]): LegMidpoint[] =>
  points.slice(1).map((to, index) => {
    const from = points[index]
    return { legIndex: index, lat: (from.lat + to.lat) / 2, lon: (from.lon + to.lon) / 2 }
  })

/**
 * Position of a profile marker (TOC, TOD) `distanceNm` along the route, for drawing only:
 * placed on the straight line of its leg, in proportion of the leg distances the API gave.
 */
export function pointAlongRoute(points: MapPoint[], legDistancesNm: number[], distanceNm: number): MapPoint | null {
  if (points.length < 2 || legDistancesNm.length !== points.length - 1) return null
  let start = 0
  for (let i = 0; i < legDistancesNm.length; i++) {
    const length = legDistancesNm[i]
    if (distanceNm <= start + length || i === legDistancesNm.length - 1) {
      const ratio = length > 0 ? Math.min(Math.max((distanceNm - start) / length, 0), 1) : 0
      const from = points[i]
      const to = points[i + 1]
      return { lat: from.lat + (to.lat - from.lat) * ratio, lon: from.lon + (to.lon - from.lon) * ratio }
    }
    start += length
  }
  return null
}

export function routeFeatures(
  points: MapPoint[],
  alternate: MapPoint | null,
  profile: ProfilePoint[] = [],
  legDistancesNm: number[] = [],
) {
  const features: Record<string, unknown>[] = []
  if (points.length >= 2) {
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: points.map((point) => [point.lon, point.lat]) },
      properties: { kind: "route" },
    })
  }
  const destination = points[points.length - 1]
  if (alternate && destination) {
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [destination.lon, destination.lat],
          [alternate.lon, alternate.lat],
        ],
      },
      properties: { kind: "alternate" },
    })
  }
  for (const marker of profile.filter((point) => point.label === "TOC" || point.label === "TOD")) {
    const position = pointAlongRoute(points, legDistancesNm, marker.distanceNm)
    if (position) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [position.lon, position.lat] },
        properties: { kind: "profile", label: marker.label },
      })
    }
  }
  return { type: "FeatureCollection" as const, features }
}

export function routeLayers() {
  return [
    {
      id: ROUTE_LAYERS.casing,
      type: "line",
      source: ROUTE_SOURCE,
      filter: ["==", ["get", "kind"], "route"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.85 },
    },
    {
      id: ROUTE_LAYERS.line,
      type: "line",
      source: ROUTE_SOURCE,
      filter: ["==", ["get", "kind"], "route"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#c2410c", "line-width": 3.5 },
    },
    {
      id: ROUTE_LAYERS.alternate,
      type: "line",
      source: ROUTE_SOURCE,
      filter: ["==", ["get", "kind"], "alternate"],
      paint: { "line-color": "#c2410c", "line-width": 2.5, "line-dasharray": [2, 2] },
    },
    {
      id: ROUTE_LAYERS.markers,
      type: "circle",
      source: ROUTE_SOURCE,
      filter: ["==", ["get", "kind"], "profile"],
      paint: { "circle-radius": 4, "circle-color": "#ffffff", "circle-stroke-color": "#c2410c", "circle-stroke-width": 2 },
    },
    {
      id: ROUTE_LAYERS.markerLabels,
      type: "symbol",
      source: ROUTE_SOURCE,
      filter: ["==", ["get", "kind"], "profile"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-offset": [0, -1.2],
        "text-font": ["Noto Sans Bold"],
      },
      paint: { "text-color": "#c2410c", "text-halo-color": "#ffffff", "text-halo-width": 1.2 },
    },
  ]
}
