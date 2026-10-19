import { AIRSPACE_STYLES } from "@/lib/navplan/status"
import type { Airspace, CheckStatus } from "@/lib/navplan/types"

// Airspaces drawn from our API (airspacesInBox), coloured by type with their vertical limits.

export const AIRSPACE_SOURCE = "aero-airspaces"
export const AIRSPACE_LAYERS = {
  fill: "aero-airspaces-fill",
  line: "aero-airspaces-line",
  lineDashed: "aero-airspaces-line-dashed",
  crossedFill: "aero-airspaces-crossed-fill",
  crossedLine: "aero-airspaces-crossed-line",
  label: "aero-airspaces-label",
} as const

/** Outline of an airspace the route goes through, by the worst status of its crossing. */
export const CROSSED_STYLES: Record<CheckStatus, { color: string; fillOpacity: number; width: number }> = {
  // Only a forbidden area is filled: a route crosses many areas around Paris, their fills would add up.
  BLOCKING: { color: "#dc2626", fillOpacity: 0.14, width: 3 },
  WARNING: { color: "#d97706", fillOpacity: 0, width: 3 },
  OK: { color: "#2563eb", fillOpacity: 0, width: 2 },
}

/** "R 45 A\nFL065 / SFC": name, then ceiling over floor as on a chart. */
export const airspaceLabel = (airspace: Pick<Airspace, "name" | "floor" | "ceiling">) =>
  `${airspace.name}\n${airspace.ceiling.label} / ${airspace.floor.label}`

/**
 * The airspaces as map features. `crossed` gives, by airspace id, the worst status of the route's
 * crossing of it: those are drawn last, outlined in the colour of that status.
 */
export function airspaceFeatures(airspaces: Airspace[], crossed: Record<string, CheckStatus> = {}) {
  return {
    type: "FeatureCollection" as const,
    features: airspaces
      // An area without a published outline has no coordinates: nothing to draw.
      .filter((airspace) => airspace.geometry && Array.isArray(airspace.geometry.coordinates) && airspace.geometry.coordinates.length > 0)
      .sort((a, b) => Number(a.id in crossed) - Number(b.id in crossed))
      .map((airspace) => {
        const style = AIRSPACE_STYLES[airspace.type] ?? AIRSPACE_STYLES.OTHER
        const status = crossed[airspace.id]
        return {
          type: "Feature" as const,
          id: airspace.id,
          geometry: airspace.geometry,
          properties: {
            id: airspace.id,
            type: airspace.type,
            color: style.color,
            fillOpacity: style.fillOpacity,
            dashed: style.dashed,
            label: airspaceLabel(airspace),
            crossed: status ?? "",
            crossedColor: status ? CROSSED_STYLES[status].color : "",
            crossedFillOpacity: status ? CROSSED_STYLES[status].fillOpacity : 0,
            crossedWidth: status ? CROSSED_STYLES[status].width : 0,
          },
        }
      }),
  }
}

export function airspaceLayers() {
  return [
    {
      id: AIRSPACE_LAYERS.fill,
      type: "fill",
      source: AIRSPACE_SOURCE,
      paint: { "fill-color": ["get", "color"], "fill-opacity": ["get", "fillOpacity"] },
    },
    {
      id: AIRSPACE_LAYERS.line,
      type: "line",
      source: AIRSPACE_SOURCE,
      filter: ["!=", ["get", "dashed"], true],
      paint: { "line-color": ["get", "color"], "line-width": 1.5 },
    },
    {
      id: AIRSPACE_LAYERS.lineDashed,
      type: "line",
      source: AIRSPACE_SOURCE,
      filter: ["==", ["get", "dashed"], true],
      paint: { "line-color": ["get", "color"], "line-width": 1.5, "line-dasharray": [3, 2] },
    },
    // Crossed by the route: a thick outline in the colour of the verdict, a fill when forbidden.
    {
      id: AIRSPACE_LAYERS.crossedFill,
      type: "fill",
      source: AIRSPACE_SOURCE,
      filter: ["!=", ["get", "crossed"], ""],
      paint: { "fill-color": ["get", "crossedColor"], "fill-opacity": ["get", "crossedFillOpacity"] },
    },
    {
      id: AIRSPACE_LAYERS.crossedLine,
      type: "line",
      source: AIRSPACE_SOURCE,
      filter: ["!=", ["get", "crossed"], ""],
      paint: { "line-color": ["get", "crossedColor"], "line-width": ["get", "crossedWidth"] },
    },
    {
      id: AIRSPACE_LAYERS.label,
      type: "symbol",
      source: AIRSPACE_SOURCE,
      minzoom: 7,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-font": ["Noto Sans Regular"],
        "text-max-width": 12,
      },
      paint: { "text-color": ["get", "color"], "text-halo-color": "#ffffff", "text-halo-width": 1.2 },
    },
  ]
}
