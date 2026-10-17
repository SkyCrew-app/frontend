import { AIRSPACE_STYLES } from "@/lib/navplan/status"
import type { Airspace } from "@/lib/navplan/types"

// Airspaces drawn from our API (airspacesInBox), coloured by type with their vertical limits.

export const AIRSPACE_SOURCE = "aero-airspaces"
export const AIRSPACE_LAYERS = {
  fill: "aero-airspaces-fill",
  line: "aero-airspaces-line",
  lineDashed: "aero-airspaces-line-dashed",
  label: "aero-airspaces-label",
} as const

/** "R 45 A\nFL065 / SFC": name, then ceiling over floor as on a chart. */
export const airspaceLabel = (airspace: Pick<Airspace, "name" | "floor" | "ceiling">) =>
  `${airspace.name}\n${airspace.ceiling.label} / ${airspace.floor.label}`

export function airspaceFeatures(airspaces: Airspace[]) {
  return {
    type: "FeatureCollection" as const,
    features: airspaces
      // An area without a published outline has no coordinates: nothing to draw.
      .filter((airspace) => airspace.geometry && Array.isArray(airspace.geometry.coordinates) && airspace.geometry.coordinates.length > 0)
      .map((airspace) => {
        const style = AIRSPACE_STYLES[airspace.type] ?? AIRSPACE_STYLES.OTHER
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
