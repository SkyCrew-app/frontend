"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useApolloClient } from "@apollo/client"
import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"
import { MapPinOff } from "lucide-react"
import type { AddLayerObject, GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl"
import { AIRSPACES_IN_BOX, NAV_POINTS_IN_BOX } from "@/graphql/navdata"
import type { Airspace, NavPoint } from "@/lib/navplan/types"
import { cn } from "@/lib/utils"
import { BASE_MAP_ATTRIBUTION, mapStyleUrl } from "./style"
import { AIRSPACE_SOURCE, airspaceFeatures, airspaceLayers } from "./layers/airspaces"
import { NAVPOINT_LAYERS, NAVPOINT_SOURCE, navPointFeatures, navPointFromFeature, navPointLayers } from "./layers/navpoints"
import { ROUTE_SOURCE, legMidpoints, routeFeatures, routeLayers } from "./layers/route"
import type { AeroMapProps } from "./types"
import "maplibre-gl/dist/maplibre-gl.css"
import "./aero-map.css"

// France, when there is no route yet.
const DEFAULT_CENTER: [number, number] = [2.5, 46.6]
const DEFAULT_ZOOM = 5
// Below these zooms the API would return too much: overlays are not asked.
const AIRSPACE_MIN_ZOOM = 5
const NAVPOINT_MIN_ZOOM = 7

type MapState = "loading" | "ready" | "unavailable"
type MapLibrary = typeof import("maplibre-gl")
type GeoJson = Parameters<GeoJSONSource["setData"]>[0]

// The bundler hands the UMD build either as the namespace itself or under `default`.
const mapLibrary = (module: MapLibrary & { default?: MapLibrary }): MapLibrary => module.default ?? module
// Our feature builders return plain GeoJSON objects; MapLibre's type is stricter about their shape.
const asGeoJson = (data: { type: "FeatureCollection"; features: unknown[] }) => data as unknown as GeoJson
const setSourceData = (map: MapLibreMap, id: string, data: { type: "FeatureCollection"; features: unknown[] }) =>
  map.getSource<GeoJSONSource>(id)?.setData(asGeoJson(data))

export default function AeroMap(props: AeroMapProps) {
  const { resolvedTheme } = useTheme()
  const theme = resolvedTheme === "dark" ? "dark" : "light"
  // A new style drops the layers we added: the map is rebuilt for the other theme.
  return <AeroMapCanvas key={theme} theme={theme} {...props} />
}

function AeroMapCanvas({
  points,
  alternate = null,
  profile = [],
  legDistancesNm = [],
  editable = false,
  onAddPoint,
  onMoveWaypoint,
  onInsertPoint,
  className,
  theme,
}: AeroMapProps & { theme: "light" | "dark" }) {
  const { t } = useTranslation("navplan")
  const client = useApolloClient()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const libraryRef = useRef<MapLibrary | null>(null)
  const markersRef = useRef<Marker[]>([])
  const navPointsRef = useRef<NavPoint[]>([])
  const fittedRef = useRef(false)
  const [state, setState] = useState<MapState>("loading")

  // Latest callbacks, read by map listeners registered once.
  const callbacks = useRef({ onAddPoint, onMoveWaypoint, onInsertPoint, editable })
  callbacks.current = { onAddPoint, onMoveWaypoint, onInsertPoint, editable }

  const loadOverlays = useCallback(async () => {
    const map = mapRef.current
    if (!map) return
    const bounds = map.getBounds()
    const bbox = { south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() }
    const zoom = map.getZoom()
    try {
      if (zoom >= AIRSPACE_MIN_ZOOM) {
        const { data } = await client.query<{ airspacesInBox: Airspace[] }>({ query: AIRSPACES_IN_BOX, variables: { bbox } })
        setSourceData(map, AIRSPACE_SOURCE, airspaceFeatures(data?.airspacesInBox ?? []))
      }
      const { data } =
        zoom >= NAVPOINT_MIN_ZOOM
          ? await client.query<{ navPointsInBox: NavPoint[] }>({ query: NAV_POINTS_IN_BOX, variables: { bbox } })
          : { data: { navPointsInBox: [] as NavPoint[] } }
      navPointsRef.current = data?.navPointsInBox ?? []
      setSourceData(map, NAVPOINT_SOURCE, navPointFeatures(navPointsRef.current))
    } catch {
      // Too much to show at this zoom, or the API is unreachable: the route stays usable.
    }
  }, [client])

  // Build the map once.
  useEffect(() => {
    let cancelled = false
    let moveTimer: ReturnType<typeof setTimeout> | undefined

    import("maplibre-gl")
      .then((module) => {
        const maplibregl = mapLibrary(module)
        if (cancelled || !containerRef.current) return
        libraryRef.current = maplibregl
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: mapStyleUrl(theme),
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          attributionControl: {
            compact: true,
            customAttribution: [BASE_MAP_ATTRIBUTION, t("map.notAnAeronauticalChart"), t("map.siaAttribution")],
          },
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        })
        mapRef.current = map
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right")
        map.addControl(new maplibregl.ScaleControl({ unit: "nautical" }), "bottom-left")

        map.on("load", () => {
          if (cancelled) return
          map.addSource(AIRSPACE_SOURCE, { type: "geojson", data: asGeoJson(airspaceFeatures([])) })
          map.addSource(NAVPOINT_SOURCE, { type: "geojson", data: asGeoJson(navPointFeatures([])) })
          map.addSource(ROUTE_SOURCE, { type: "geojson", data: asGeoJson(routeFeatures([], null)) })
          for (const layer of [...airspaceLayers(), ...routeLayers(), ...navPointLayers()]) map.addLayer(layer as AddLayerObject)
          setState("ready")
          void loadOverlays()
        })
        map.on("moveend", () => {
          clearTimeout(moveTimer)
          moveTimer = setTimeout(() => void loadOverlays(), 250)
        })
        map.on("click", (event) => {
          const { editable: canEdit, onAddPoint: add } = callbacks.current
          if (!canEdit || !add) return
          const hit = map.queryRenderedFeatures(event.point, { layers: [NAVPOINT_LAYERS.circle] })[0]
          const navPoint = hit ? navPointFromFeature(hit.properties, navPointsRef.current) : null
          add(navPoint ?? { lat: event.lngLat.lat, lon: event.lngLat.lng })
        })
        map.on("error", () => {
          // Tiles of the base map failing must not hide the route: only a failed start is fatal.
        })
      })
      .catch(() => {
        if (!cancelled) setState("unavailable")
      })

    return () => {
      cancelled = true
      clearTimeout(moveTimer)
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
    // The map is built once per theme; later props are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Route line, alternate, TOC/TOD.
  useEffect(() => {
    if (state !== "ready") return
    if (mapRef.current) setSourceData(mapRef.current, ROUTE_SOURCE, routeFeatures(points, alternate, profile, legDistancesNm))
  }, [state, points, alternate, profile, legDistancesNm])

  // Point markers (draggable in edit mode) and leg handles to insert a point.
  useEffect(() => {
    const map = mapRef.current
    const maplibregl = libraryRef.current
    if (state !== "ready" || !map || !maplibregl) return
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    points.forEach((point, index) => {
      const isEnd = index === 0 || index === points.length - 1
      const waypointIndex = index - 1
      const draggable = editable && !isEnd
      const element = document.createElement(draggable ? "button" : "div")
      element.className = cn("aero-marker", isEnd ? "aero-marker--end" : "aero-marker--point")
      element.textContent = point.ident
      if (draggable) {
        element.setAttribute("type", "button")
        element.setAttribute("aria-label", t("map.dragPoint", { ident: point.ident }))
      }
      const marker = new maplibregl.Marker({ element, draggable }).setLngLat([point.lon, point.lat]).addTo(map)
      if (draggable) {
        marker.on("dragend", () => {
          const { lat, lng } = marker.getLngLat()
          callbacks.current.onMoveWaypoint?.(waypointIndex, lat, lng)
        })
      }
      markersRef.current.push(marker)
    })

    if (alternate) {
      const element = document.createElement("div")
      element.className = "aero-marker aero-marker--alternate"
      element.textContent = alternate.ident
      markersRef.current.push(new maplibregl.Marker({ element }).setLngLat([alternate.lon, alternate.lat]).addTo(map))
    }

    if (editable && onInsertPoint) {
      legMidpoints(points).forEach((midpoint) => {
        const element = document.createElement("button")
        element.type = "button"
        element.className = "aero-marker aero-marker--handle"
        element.textContent = "+"
        element.setAttribute("aria-label", t("map.insertHandle", { leg: midpoint.legIndex + 1 }))
        const marker = new maplibregl.Marker({ element, draggable: true }).setLngLat([midpoint.lon, midpoint.lat]).addTo(map)
        marker.on("dragend", () => {
          const { lat, lng } = marker.getLngLat()
          callbacks.current.onInsertPoint?.(midpoint.legIndex, lat, lng)
        })
        markersRef.current.push(marker)
      })
    }

    // Frame the route the first time it has two ends.
    if (!fittedRef.current && points.length >= 2) {
      const bounds = new maplibregl.LngLatBounds()
      ;[...points, ...(alternate ? [alternate] : [])].forEach((point) => bounds.extend([point.lon, point.lat]))
      map.fitBounds(bounds, { padding: 48, maxZoom: 10, duration: 0 })
      fittedRef.current = true
    } else if (!fittedRef.current && points.length === 1) {
      map.flyTo({ center: [points[0].lon, points[0].lat], zoom: 9 })
    }
  }, [state, points, alternate, editable, onInsertPoint, t])

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-muted", className)}>
      <div
        ref={containerRef}
        className="absolute inset-0"
        role="region"
        aria-label={editable ? t("map.labelEditable") : t("map.label")}
      />
      {state === "unavailable" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
          <MapPinOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">{t("map.unavailableTitle")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("map.unavailableDescription")}</p>
        </div>
      )}
    </div>
  )
}
