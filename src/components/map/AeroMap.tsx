"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useApolloClient } from "@apollo/client"
import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"
import { Layers, MapPinOff, MousePointerClick } from "lucide-react"
import type { AddLayerObject, GeoJSONSource, Map as MapLibreMap, MapGeoJSONFeature, Marker, Popup } from "maplibre-gl"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AIRSPACES_IN_BOX, NAV_POINTS_IN_BOX, OBSTACLES_IN_BOX } from "@/graphql/navdata"
import { pointLabel } from "@/lib/navplan/aerodrome"
import { airspaceTypeLabel } from "@/lib/navplan/status"
import type { Airspace, CheckStatus, LegObstacle, NavPoint, Obstacle } from "@/lib/navplan/types"
import { cn } from "@/lib/utils"
import { BASE_MAP_ATTRIBUTION, DEFAULT_MAP_STYLE_DARK_URL, DEFAULT_MAP_STYLE_URL, mapStyleUrl } from "./style"
import { AIRSPACE_LAYERS, AIRSPACE_SOURCE, airspaceFeatures, airspaceLayers } from "./layers/airspaces"
import {
  ACTIVITY_LAYERS,
  ACTIVITY_SOURCE,
  activityFeatures,
  activityLayers,
  OBSTACLE_LAYERS,
  OBSTACLE_SOURCE,
  obstacleFeatures,
  obstacleLayers,
  type ActivityGroup,
} from "./layers/activities"
import { NAVPOINT_LAYERS, NAVPOINT_SOURCE, navPointFeatures, navPointFromFeature, navPointLayers } from "./layers/navpoints"
import { ROUTE_SOURCE, legMidpoints, routeFeatures, routeLayers } from "./layers/route"
import type { AeroMapProps } from "./types"
import "maplibre-gl/dist/maplibre-gl.css"
import "./aero-map.css"

const OPENFREEMAP_STYLES = new Set([DEFAULT_MAP_STYLE_URL, DEFAULT_MAP_STYLE_DARK_URL])
// Room left under the route for the attribution, open when the map starts.
const FIT_PADDING = { top: 48, right: 48, bottom: 96, left: 48 }

// France, when there is no route yet.
const DEFAULT_CENTER: [number, number] = [2.5, 46.6]
const DEFAULT_ZOOM = 5
// Below these zooms the API would return too much: overlays are not asked.
const AIRSPACE_MIN_ZOOM = 5
const NAVPOINT_MIN_ZOOM = 7
// About 0.7° wide: a few hundred obstacles (13 000 in mainland France, 78 % wind turbines).
const OBSTACLE_MIN_ZOOM = 10
// Areas listed in the popup of a click; the others are counted.
const POPUP_MAX_AREAS = 3

type MapLayers = Record<ActivityGroup | "obstacles", boolean>
// Information layers off by default (they would clutter the route); obstacles once zoomed in.
const DEFAULT_LAYERS: MapLayers = { activities: false, model: false, obstacles: true }
const NO_OBSTACLE: LegObstacle[] = []

type MapState = "loading" | "ready" | "unavailable"
const NO_CROSSING: Record<string, CheckStatus> = {}
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
  legLabels = [],
  crossedAirspaces,
  warnedObstacles = NO_OBSTACLE,
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
  // Last airspaces received, redrawn when the crossings of the route change.
  const airspacesRef = useRef<Airspace[]>([])
  const crossedRef = useRef<Record<string, CheckStatus>>({})
  crossedRef.current = crossedAirspaces ?? NO_CROSSING
  const fittedRef = useRef(false)
  // Idents of the route: the overlay of nav points leaves them to the route markers.
  const routeIdentsRef = useRef<string[]>([])
  routeIdentsRef.current = [...points.map((point) => point.ident), ...(alternate ? [alternate.ident] : [])]
  const [state, setState] = useState<MapState>("loading")
  const [layers, setLayers] = useState<MapLayers>(DEFAULT_LAYERS)
  const layersRef = useRef(layers)
  layersRef.current = layers
  // On a map where a click adds a point, "identify" makes a click show what is there instead.
  const [identify, setIdentify] = useState(false)
  const obstaclesRef = useRef<Obstacle[]>([])
  const warnedRef = useRef<LegObstacle[]>(warnedObstacles)
  warnedRef.current = warnedObstacles
  const popupRef = useRef<Popup | null>(null)

  // Latest callbacks, read by map listeners registered once.
  const callbacks = useRef({ onAddPoint, onMoveWaypoint, onInsertPoint, editable, identify })
  callbacks.current = { onAddPoint, onMoveWaypoint, onInsertPoint, editable, identify }

  const loadOverlays = useCallback(async () => {
    const map = mapRef.current
    if (!map) return
    const bounds = map.getBounds()
    const bbox = { south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() }
    const zoom = map.getZoom()
    try {
      if (zoom >= AIRSPACE_MIN_ZOOM) {
        const { data } = await client.query<{ airspacesInBox: Airspace[] }>({ query: AIRSPACES_IN_BOX, variables: { bbox } })
        airspacesRef.current = data?.airspacesInBox ?? []
        setSourceData(map, AIRSPACE_SOURCE, airspaceFeatures(airspacesRef.current, crossedRef.current))
        setSourceData(map, ACTIVITY_SOURCE, activityFeatures(airspacesRef.current, layersRef.current, crossedRef.current))
      }
      obstaclesRef.current = []
      if (layersRef.current.obstacles && zoom >= OBSTACLE_MIN_ZOOM) {
        try {
          const { data: obstacles } = await client.query<{ obstaclesInBox: Obstacle[] }>({ query: OBSTACLES_IN_BOX, variables: { bbox } })
          obstaclesRef.current = obstacles?.obstaclesInBox ?? []
        } catch {
          // Too many in the box: they come back once zoomed in.
        }
      }
      setSourceData(map, OBSTACLE_SOURCE, obstacleFeatures(obstaclesRef.current, warnedRef.current))
      const { data } =
        zoom >= NAVPOINT_MIN_ZOOM
          ? await client.query<{ navPointsInBox: NavPoint[] }>({ query: NAV_POINTS_IN_BOX, variables: { bbox } })
          : { data: { navPointsInBox: [] as NavPoint[] } }
      navPointsRef.current = data?.navPointsInBox ?? []
      setSourceData(map, NAVPOINT_SOURCE, navPointFeatures(navPointsRef.current, routeIdentsRef.current))
    } catch {
      // Too much to show at this zoom, or the API is unreachable: the route stays usable.
    }
  }, [client])

  // What is under a click: areas (with their limits, hours, frequency and first instruction),
  // activities and obstacles. Built as DOM text (never HTML from the data).
  const showPopup = (maplibregl: MapLibrary, map: MapLibreMap, lngLat: { lng: number; lat: number }, features: MapGeoJSONFeature[]) => {
    const areaIds = new Set<string>()
    const obstacles: Record<string, unknown>[] = []
    for (const feature of features) {
      const layer = feature.layer.id
      if (layer === AIRSPACE_LAYERS.fill || layer === AIRSPACE_LAYERS.crossedFill || layer === ACTIVITY_LAYERS.point || layer === ACTIVITY_LAYERS.ring) {
        const id = feature.properties?.id
        if (typeof id === "string") areaIds.add(id)
      } else if (layer === OBSTACLE_LAYERS.point && feature.properties) obstacles.push(feature.properties)
    }
    const areas = [...areaIds].map((id) => airspacesRef.current.find((airspace) => airspace.id === id)).filter((airspace): airspace is Airspace => !!airspace)
    const root = document.createElement("div")
    root.className = "aero-popup"
    const add = (tag: string, text: string, className?: string) => {
      const element = document.createElement(tag)
      element.textContent = text
      if (className) element.className = className
      root.appendChild(element)
      return element
    }
    add("p", t("map.popupTitle"), "aero-popup__title")
    if (areas.length === 0 && obstacles.length === 0) add("p", t("map.popupNone"))
    for (const airspace of areas.slice(0, POPUP_MAX_AREAS)) {
      add("p", `${airspace.name} — ${airspaceTypeLabel(airspace.type)}${airspace.icaoClass ? ` ${t("crossings.class", { value: airspace.icaoClass })}` : ""}`, "aero-popup__name")
      add("p", t("crossings.limits", { ceiling: airspace.ceiling.label, floor: airspace.floor.label }))
      if (airspace.hours) add("p", t("crossings.hours", { value: airspace.hours.split("\n").join(" · ") }))
      if (airspace.activity && airspace.activity !== airspace.hours) add("p", t("crossings.activityLabel", { value: airspace.activity.split("\n").join(" · ") }))
      const radio = airspace.frequencies[0]
      if (radio) add("p", `${radio.callsign ?? radio.service} ${radio.mhz}`)
      if (airspace.remarks) add("p", airspace.remarks.split("\n")[0], "aero-popup__muted")
    }
    if (areas.length > POPUP_MAX_AREAS) add("p", t("map.popupMore", { count: areas.length - POPUP_MAX_AREAS }), "aero-popup__muted")
    for (const obstacle of obstacles.slice(0, 3)) {
      add("p", t("map.obstacleLabel", { type: String(obstacle.type), amsl: `${obstacle.amslFt} ft`, agl: obstacle.aglFt != null ? `${obstacle.aglFt} ft` : "?" }), "aero-popup__name")
    }
    popupRef.current?.remove()
    popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "18rem" }).setLngLat(lngLat).setDOMContent(root).addTo(map)
  }

  // Build the map once.
  useEffect(() => {
    let cancelled = false
    let moveTimer: ReturnType<typeof setTimeout> | undefined
    let resizeObserver: ResizeObserver | undefined

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
            customAttribution: [
              // OpenFreeMap's own style already credits OpenFreeMap, OpenMapTiles and OpenStreetMap.
              ...(OPENFREEMAP_STYLES.has(mapStyleUrl(theme)) ? [] : [BASE_MAP_ATTRIBUTION]),
              t("map.notAnAeronauticalChart"),
              t("map.siaAttribution"),
            ],
          },
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        })
        mapRef.current = map
        // The map may be laid out while hidden (a step not shown yet): it follows its box.
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => map.resize())
          resizeObserver.observe(containerRef.current)
        }
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right")
        map.addControl(new maplibregl.ScaleControl({ unit: "nautical" }), "bottom-left")

        map.on("load", () => {
          if (cancelled) return
          map.addSource(AIRSPACE_SOURCE, { type: "geojson", data: asGeoJson(airspaceFeatures([])) })
          map.addSource(NAVPOINT_SOURCE, { type: "geojson", data: asGeoJson(navPointFeatures([])) })
          map.addSource(ROUTE_SOURCE, { type: "geojson", data: asGeoJson(routeFeatures([], null)) })
          map.addSource(ACTIVITY_SOURCE, { type: "geojson", data: asGeoJson(activityFeatures([], {})) })
          map.addSource(OBSTACLE_SOURCE, { type: "geojson", data: asGeoJson(obstacleFeatures([])) })
          // Bottom to top: areas, activities, obstacles, nav points around, then the route over them.
          for (const layer of [...airspaceLayers(), ...activityLayers(), ...obstacleLayers(), ...navPointLayers(theme), ...routeLayers(theme)])
            map.addLayer(layer as AddLayerObject)
          setState("ready")
          void loadOverlays()
        })
        map.on("moveend", () => {
          clearTimeout(moveTimer)
          moveTimer = setTimeout(() => void loadOverlays(), 250)
        })
        map.on("click", (event) => {
          const { editable: canEdit, onAddPoint: add, identify: identifying } = callbacks.current
          if (!canEdit || !add || identifying) {
            showPopup(maplibregl, map, event.lngLat, map.queryRenderedFeatures(event.point))
            return
          }
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
      resizeObserver?.disconnect()
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      popupRef.current?.remove()
      mapRef.current?.remove()
      mapRef.current = null
    }
    // The map is built once per theme; later props are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Route line, alternate, TOC/TOD.
  useEffect(() => {
    if (state !== "ready") return
    const map = mapRef.current
    if (!map) return
    setSourceData(map, ROUTE_SOURCE, routeFeatures(points, alternate, profile, legDistancesNm, legLabels))
    setSourceData(map, NAVPOINT_SOURCE, navPointFeatures(navPointsRef.current, routeIdentsRef.current))
  }, [state, points, alternate, profile, legDistancesNm, legLabels])

  // Airspaces crossed by the route, drawn over the others; activities shown or met by the route.
  useEffect(() => {
    if (state !== "ready") return
    const map = mapRef.current
    if (!map) return
    setSourceData(map, AIRSPACE_SOURCE, airspaceFeatures(airspacesRef.current, crossedAirspaces ?? NO_CROSSING))
    setSourceData(map, ACTIVITY_SOURCE, activityFeatures(airspacesRef.current, layers, crossedAirspaces ?? NO_CROSSING))
  }, [state, crossedAirspaces, layers])

  // Obstacles: switched on or off, and those the plan warns of.
  useEffect(() => {
    if (state !== "ready") return
    const map = mapRef.current
    if (!map) return
    if (layers.obstacles) void loadOverlays()
    else setSourceData(map, OBSTACLE_SOURCE, obstacleFeatures([], warnedObstacles))
  }, [state, layers.obstacles, warnedObstacles, loadOverlays])

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
      element.className = cn("aero-marker", isEnd ? "aero-marker--end" : "aero-marker--point", theme === "dark" && "aero-marker--dark")
      element.textContent = pointLabel(point)
      if (draggable) {
        element.setAttribute("type", "button")
        element.setAttribute("aria-label", t("map.dragPoint", { ident: pointLabel(point) }))
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
      element.className = cn("aero-marker aero-marker--alternate", theme === "dark" && "aero-marker--dark")
      element.textContent = alternate.ident
      markersRef.current.push(new maplibregl.Marker({ element }).setLngLat([alternate.lon, alternate.lat]).addTo(map))
    }

    if (editable && onInsertPoint) {
      legMidpoints(points).forEach((midpoint) => {
        const element = document.createElement("button")
        element.type = "button"
        element.className = cn("aero-marker aero-marker--handle", theme === "dark" && "aero-marker--dark")
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
      map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: 10, duration: 0 })
      fittedRef.current = true
    } else if (!fittedRef.current && points.length === 1) {
      map.flyTo({ center: [points[0].lon, points[0].lat], zoom: 9 })
    }
  }, [state, points, alternate, editable, onInsertPoint, t, theme])

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-muted", className)}>
      <div
        ref={containerRef}
        // Sized by height, not by position: MapLibre's own class sets "position: relative" on it.
        className="h-full w-full"
        role="region"
        aria-label={editable ? t("map.labelEditable") : t("map.label")}
      />
      {state === "ready" && (
        <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="secondary" size="sm" className="h-8 gap-1.5 shadow-sm">
                <Layers className="h-4 w-4" aria-hidden="true" />
                {t("map.layers")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 space-y-2" align="start" aria-label={t("map.layers")}>
              {(
                [
                  ["activities", t("map.layerActivities")],
                  ["model", t("map.layerModel")],
                  ["obstacles", t("map.layerObstacles")],
                ] as [keyof MapLayers, string][]
              ).map(([key, label]) => (
                <div key={key} className="flex items-start gap-2">
                  <Checkbox
                    id={`map-layer-${key}`}
                    checked={layers[key]}
                    onCheckedChange={(checked) => setLayers((current) => ({ ...current, [key]: checked === true }))}
                  />
                  <Label htmlFor={`map-layer-${key}`} className="text-sm font-normal leading-snug">
                    {label}
                  </Label>
                </div>
              ))}
            </PopoverContent>
          </Popover>
          {editable && (
            <Button
              type="button"
              variant={identify ? "default" : "secondary"}
              size="sm"
              className="h-8 gap-1.5 shadow-sm"
              aria-pressed={identify}
              title={identify ? t("map.identify") : t("map.identifyOff")}
              onClick={() => setIdentify((current) => !current)}
            >
              <MousePointerClick className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{t("map.identifyShort")}</span>
            </Button>
          )}
        </div>
      )}
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
