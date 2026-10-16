// Minimal typings of the part of MapLibre GL JS (maplibre-gl ^5) the map uses.
// TEMPORARY: the package is not installed yet in this checkout. Delete this file once
// `maplibre-gl` is in package.json: the package ships its own (complete) typings, and the
// calls made in src/components/map/** are the same.
declare module "maplibre-gl" {
  export type LngLatLike = [number, number] | { lng: number; lat: number }
  export type LngLatBoundsLike = [[number, number], [number, number]] | LngLatBounds

  export class LngLat {
    lng: number
    lat: number
  }

  export class LngLatBounds {
    constructor(sw?: LngLatLike, ne?: LngLatLike)
    extend(point: LngLatLike | LngLatBounds): this
    getSouth(): number
    getWest(): number
    getNorth(): number
    getEast(): number
    isEmpty(): boolean
  }

  export interface PointLike {
    x: number
    y: number
  }

  export interface MapMouseEvent {
    lngLat: LngLat
    point: PointLike
    originalEvent: MouseEvent
  }

  export interface MapGeoJSONFeature {
    properties: Record<string, unknown>
    layer: { id: string }
  }

  export interface GeoJSONSource {
    setData(data: unknown): this
  }

  export interface MapOptions {
    container: HTMLElement | string
    style: string | Record<string, unknown>
    center?: LngLatLike
    zoom?: number
    bounds?: LngLatBoundsLike
    fitBoundsOptions?: { padding?: number; maxZoom?: number }
    attributionControl?: false | { compact?: boolean; customAttribution?: string | string[] }
    cooperativeGestures?: boolean
    dragRotate?: boolean
    pitchWithRotate?: boolean
    touchPitch?: boolean
  }

  export interface IControl {
    onAdd(map: Map): HTMLElement
    onRemove(map: Map): void
  }

  export class NavigationControl implements IControl {
    constructor(options?: { showCompass?: boolean; showZoom?: boolean; visualizePitch?: boolean })
    onAdd(map: Map): HTMLElement
    onRemove(map: Map): void
  }

  export class ScaleControl implements IControl {
    constructor(options?: { maxWidth?: number; unit?: "imperial" | "metric" | "nautical" })
    onAdd(map: Map): HTMLElement
    onRemove(map: Map): void
  }

  export class Map {
    constructor(options: MapOptions)
    addControl(control: IControl, position?: "top-left" | "top-right" | "bottom-left" | "bottom-right"): this
    addSource(id: string, source: Record<string, unknown>): this
    getSource<T = GeoJSONSource>(id: string): T | undefined
    addLayer(layer: Record<string, unknown>, beforeId?: string): this
    getLayer(id: string): unknown
    setLayoutProperty(layerId: string, name: string, value: unknown): this
    setStyle(style: string | Record<string, unknown>, options?: { diff?: boolean }): this
    on(type: string, listener: (event: MapMouseEvent & Record<string, unknown>) => void): this
    on(type: string, layerId: string, listener: (event: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => void): this
    off(type: string, listener: (...args: unknown[]) => void): this
    once(type: string, listener: (...args: unknown[]) => void): this
    queryRenderedFeatures(point?: PointLike, options?: { layers?: string[] }): MapGeoJSONFeature[]
    getBounds(): LngLatBounds
    getZoom(): number
    getCanvas(): HTMLCanvasElement
    isStyleLoaded(): boolean
    fitBounds(bounds: LngLatBoundsLike, options?: { padding?: number; maxZoom?: number; duration?: number }): this
    flyTo(options: { center: LngLatLike; zoom?: number }): this
    resize(): this
    remove(): void
  }

  export class Marker {
    constructor(options?: { element?: HTMLElement; draggable?: boolean; anchor?: string; color?: string })
    setLngLat(lngLat: LngLatLike): this
    getLngLat(): LngLat
    addTo(map: Map): this
    remove(): this
    getElement(): HTMLElement
    setDraggable(draggable: boolean): this
    on(type: "dragstart" | "drag" | "dragend", listener: () => void): this
  }

  const maplibregl: {
    Map: typeof Map
    Marker: typeof Marker
    NavigationControl: typeof NavigationControl
    ScaleControl: typeof ScaleControl
    LngLatBounds: typeof LngLatBounds
  }
  export default maplibregl
}
