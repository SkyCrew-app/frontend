import { act, render, screen, waitFor } from "@testing-library/react"
import { MockedProvider } from "@apollo/client/testing"

// MapLibre draws with WebGL, which jsdom lacks: a recording stand-in checks what the component asks it.
const mockMaps: MockMap[] = []
const mockMarkers: MockMarker[] = []
let mockFailImport = false

class MockMarker {
  element: HTMLElement
  draggable: boolean
  lngLat: { lng: number; lat: number } = { lng: 0, lat: 0 }
  listeners: Record<string, () => void> = {}
  constructor(options: { element: HTMLElement; draggable?: boolean }) {
    this.element = options.element
    this.draggable = Boolean(options.draggable)
    mockMarkers.push(this)
  }
  setLngLat([lng, lat]: [number, number]) {
    this.lngLat = { lng, lat }
    return this
  }
  getLngLat() {
    return this.lngLat
  }
  addTo() {
    return this
  }
  remove() {
    return this
  }
  on(type: string, listener: () => void) {
    this.listeners[type] = listener
    return this
  }
}

class MockMap {
  options: Record<string, unknown>
  listeners: Record<string, (event?: unknown) => void> = {}
  sources: Record<string, { setData: jest.Mock }> = {}
  layers: string[] = []
  fitted: unknown = null
  removed = false
  constructor(options: Record<string, unknown>) {
    if (mockFailImport) throw new Error("WebGL unavailable")
    this.options = options
    mockMaps.push(this)
  }
  addControl() {
    return this
  }
  on(type: string, listener: (event?: unknown) => void) {
    this.listeners[type] = listener
    return this
  }
  addSource(id: string) {
    this.sources[id] = { setData: jest.fn() }
    return this
  }
  getSource(id: string) {
    return this.sources[id]
  }
  addLayer(layer: { id: string }) {
    this.layers.push(layer.id)
    return this
  }
  queryRenderedFeatures() {
    return []
  }
  getBounds() {
    return { getSouth: () => 48, getWest: () => 1, getNorth: () => 49, getEast: () => 3 }
  }
  getZoom() {
    return 4
  }
  fitBounds(bounds: unknown) {
    this.fitted = bounds
    return this
  }
  flyTo() {
    return this
  }
  remove() {
    this.removed = true
  }
}

class MockBounds {
  points: [number, number][] = []
  extend(point: [number, number]) {
    this.points.push(point)
    return this
  }
}

jest.mock(
  "maplibre-gl",
  () => {
    return {
      __esModule: true,
      default: {
        Map: MockMap,
        Marker: MockMarker,
        NavigationControl: class {},
        ScaleControl: class {},
        LngLatBounds: MockBounds,
      },
    }
  },
  { virtual: true },
)
jest.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}), { virtual: true })
jest.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }))

import AeroMap from "../AeroMap"

const points = [
  { ident: "LFPN", type: "AERODROME" as const, lat: 48.75, lon: 2.1 },
  { ident: "P1", type: "USER" as const, lat: 48.42, lon: 1.62 },
  { ident: "LFOC", type: "AERODROME" as const, lat: 48.06, lon: 1.38 },
]

const renderMap = (props: Partial<React.ComponentProps<typeof AeroMap>> = {}) =>
  render(
    <MockedProvider mocks={[]}>
      <AeroMap points={points} {...props} />
    </MockedProvider>,
  )

const loadedMap = async () => {
  await waitFor(() => expect(mockMaps).toHaveLength(1))
  const map = mockMaps[0]
  await act(async () => map.listeners.load())
  return map
}

beforeEach(() => {
  mockMaps.length = 0
  mockMarkers.length = 0
  mockFailImport = false
  delete process.env.NEXT_PUBLIC_MAP_STYLE_URL
})

describe("AeroMap", () => {
  it("draws a keyless OpenFreeMap base map with the required attributions and our aeronautical layers", async () => {
    renderMap()
    const map = await loadedMap()

    expect(map.options.style).toBe("https://tiles.openfreemap.org/styles/positron")
    const attribution = map.options.attributionControl as { customAttribution: string[] }
    // The OpenFreeMap style credits OpenFreeMap / OpenMapTiles / OpenStreetMap itself: not twice.
    expect(attribution.customAttribution.join(" ")).not.toContain("openmaptiles")
    expect(attribution.customAttribution).toEqual(["Ne remplace pas la carte aéronautique OACI", "Données aéronautiques : SIA"])
    expect(map.layers).toEqual(expect.arrayContaining(["aero-airspaces-fill", "aero-navpoints-circle", "aero-route-line"]))
    // The route is drawn over the aerodromes around it, never under them.
    expect(map.layers.indexOf("aero-route-line")).toBeGreaterThan(map.layers.indexOf("aero-navpoints-label"))
    expect(map.fitted).toBeInstanceOf(MockBounds)
    expect(screen.getByRole("region", { name: "Carte de la route" })).toBeInTheDocument()
    // MapLibre adds "maplibregl-map" (position: relative) to this element: an absolutely
    // positioned container collapsed to a height of 0 in a real browser.
    expect(screen.getByRole("region", { name: "Carte de la route" })).toHaveClass("h-full", "w-full")
    expect(screen.getByRole("region", { name: "Carte de la route" })).not.toHaveClass("absolute")
  })

  it("credits OpenStreetMap itself under a club's own base map", async () => {
    process.env.NEXT_PUBLIC_MAP_STYLE_URL = "https://tiles.example.org/style.json"
    renderMap()
    const map = await loadedMap()
    const attribution = map.options.attributionControl as { customAttribution: string[] }
    expect(attribution.customAttribution.join(" ")).toContain("https://www.openstreetmap.org/copyright")
  })

  it("lets the pilot drag a point and insert one on a leg when editing", async () => {
    const onMoveWaypoint = jest.fn()
    const onInsertPoint = jest.fn()
    renderMap({ editable: true, onMoveWaypoint, onInsertPoint })
    await loadedMap()

    const draggable = mockMarkers.filter((marker) => marker.draggable)
    // P1 and one handle per leg; the departure and the destination stay where they are.
    expect(draggable.map((marker) => marker.element.textContent)).toEqual(["P1", "+", "+"])
    expect(draggable[0].element).toHaveAccessibleName("Point P1 : faites-le glisser pour le déplacer")

    draggable[0].setLngLat([1.7, 48.5])
    draggable[0].listeners.dragend()
    expect(onMoveWaypoint).toHaveBeenCalledWith(0, 48.5, 1.7)

    draggable[2].setLngLat([1.5, 48.2])
    draggable[2].listeners.dragend()
    expect(onInsertPoint).toHaveBeenCalledWith(1, 48.2, 1.5)
  })

  it("adds a point where the pilot clicks", async () => {
    const onAddPoint = jest.fn()
    renderMap({ editable: true, onAddPoint })
    const map = await loadedMap()

    map.listeners.click({ point: { x: 1, y: 2 }, lngLat: { lat: 48.3, lng: 1.9 } })
    expect(onAddPoint).toHaveBeenCalledWith({ lat: 48.3, lon: 1.9 })
  })

  it("only shows the route when read-only", async () => {
    const onAddPoint = jest.fn()
    renderMap({ onAddPoint })
    const map = await loadedMap()

    map.listeners.click({ point: { x: 1, y: 2 }, lngLat: { lat: 48.3, lng: 1.9 } })
    expect(onAddPoint).not.toHaveBeenCalled()
    expect(mockMarkers.some((marker) => marker.draggable)).toBe(false)
  })

  it("says so when the map cannot start, without breaking the page", async () => {
    mockFailImport = true
    renderMap()
    expect(await screen.findByText("Carte indisponible")).toBeInTheDocument()
  })
})
