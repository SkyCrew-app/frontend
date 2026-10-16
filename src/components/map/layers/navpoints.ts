import type { NavPoint, NavPointType } from "@/lib/navplan/types"

// Aerodromes, radio navaids and VFR reporting points from our API (navPointsInBox).

export const NAVPOINT_SOURCE = "aero-navpoints"
export const NAVPOINT_LAYERS = {
  circle: "aero-navpoints-circle",
  label: "aero-navpoints-label",
} as const

const COLORS: Record<NavPointType, string> = {
  AERODROME: "#1d4ed8",
  VOR: "#7c3aed",
  VOR_DME: "#7c3aed",
  NDB: "#7c3aed",
  DME: "#7c3aed",
  TACAN: "#7c3aed",
  VRP: "#047857",
  USER: "#0f172a",
}

export function navPointFeatures(points: NavPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map((point) => ({
      type: "Feature" as const,
      id: point.id,
      geometry: { type: "Point" as const, coordinates: [point.lon, point.lat] },
      properties: {
        id: point.id,
        type: point.type,
        ident: point.ident,
        name: point.name ?? "",
        color: COLORS[point.type] ?? COLORS.USER,
        // Optional reporting points are drawn hollow, mandatory ones filled (as on a VAC).
        hollow: point.type === "VRP" && point.mandatory === false,
        radius: point.type === "AERODROME" ? 6 : 4.5,
      },
    })),
  }
}

export function navPointLayers() {
  return [
    {
      id: NAVPOINT_LAYERS.circle,
      type: "circle",
      source: NAVPOINT_SOURCE,
      paint: {
        "circle-radius": ["get", "radius"],
        "circle-color": ["case", ["get", "hollow"], "#ffffff", ["get", "color"]],
        "circle-stroke-color": ["get", "color"],
        "circle-stroke-width": 2,
      },
    },
    {
      id: NAVPOINT_LAYERS.label,
      type: "symbol",
      source: NAVPOINT_SOURCE,
      minzoom: 8,
      layout: {
        "text-field": ["get", "ident"],
        "text-size": 11,
        "text-offset": [0, 1.1],
        "text-anchor": "top",
        "text-font": ["Noto Sans Regular"],
      },
      paint: { "text-color": ["get", "color"], "text-halo-color": "#ffffff", "text-halo-width": 1.2 },
    },
  ]
}

/** The nav point a click on the map hit, rebuilt from the feature properties and our list. */
export const navPointFromFeature = (properties: Record<string, unknown>, points: NavPoint[]) =>
  points.find((point) => point.id === properties.id) ?? null
