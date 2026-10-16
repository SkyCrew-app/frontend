import type { NavPoint, NavPointType } from "@/lib/navplan/types"

// Aerodromes, radio navaids and VFR reporting points from our API (navPointsInBox).

export const NAVPOINT_SOURCE = "aero-navpoints"
export const NAVPOINT_LAYERS = {
  circle: "aero-navpoints-circle",
  label: "aero-navpoints-label",
} as const

// Discreet on purpose: the aerodromes around are context, the route is what the pilot reads.
const COLORS: Record<NavPointType, string> = {
  AERODROME: "#475569",
  VOR: "#7c3aed",
  VOR_DME: "#7c3aed",
  NDB: "#7c3aed",
  DME: "#7c3aed",
  TACAN: "#7c3aed",
  VRP: "#047857",
  USER: "#0f172a",
}

/**
 * Nav points around the route. Those of the route itself (`hidden` idents) are left out: the route
 * draws them, larger and in its colour, and a second dot under them would only blur it.
 */
export function navPointFeatures(points: NavPoint[], hidden: Iterable<string> = []) {
  const skip = new Set(hidden)
  return {
    type: "FeatureCollection" as const,
    features: points.filter((point) => !skip.has(point.ident)).map((point) => ({
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
        aerodrome: point.type === "AERODROME",
      },
    })),
  }
}

export function navPointLayers(theme: "light" | "dark" = "light") {
  const background = theme === "dark" ? "#1e293b" : "#ffffff"
  // On the dark base map the slate of the aerodromes is lightened to stay visible.
  const color = theme === "dark" ? ["case", ["get", "aerodrome"], "#94a3b8", ["get", "color"]] : ["get", "color"]
  // Small dots when the whole route is in view, a little larger when zoomed in; the idents only
  // once there is room for them (the map drops a label that would overlap another).
  const radius = ["interpolate", ["linear"], ["zoom"], 7, ["case", ["get", "aerodrome"], 2.5, 2], 10, ["case", ["get", "aerodrome"], 4.5, 3.5], 12, ["case", ["get", "aerodrome"], 6, 4.5]]
  return [
    {
      id: NAVPOINT_LAYERS.circle,
      type: "circle",
      source: NAVPOINT_SOURCE,
      paint: {
        "circle-radius": radius,
        "circle-color": ["case", ["get", "hollow"], background, color],
        "circle-opacity": theme === "dark" ? 0.9 : 0.75,
        "circle-stroke-color": ["case", ["get", "hollow"], color, background],
        "circle-stroke-width": 1,
      },
    },
    {
      id: NAVPOINT_LAYERS.label,
      type: "symbol",
      source: NAVPOINT_SOURCE,
      minzoom: 9,
      layout: {
        "text-field": ["get", "ident"],
        "text-size": 10,
        "text-offset": [0, 0.8],
        "text-anchor": "top",
        "text-font": ["Noto Sans Regular"],
      },
      paint: {
        "text-color": color,
        "text-halo-color": background,
        "text-halo-width": 1.2,
      },
    },
  ]
}

/** The nav point a click on the map hit, rebuilt from the feature properties and our list. */
export const navPointFromFeature = (properties: Record<string, unknown>, points: NavPoint[]) =>
  points.find((point) => point.id === properties.id) ?? null
