import { airspaceFeatures, airspaceLabel, airspaceLayers } from "../layers/airspaces"
import { navPointFeatures, navPointLayers } from "../layers/navpoints"
import { legMidpoints, pointAlongRoute, routeFeatures, routeLayers } from "../layers/route"
import { DEFAULT_MAP_STYLE_DARK_URL, DEFAULT_MAP_STYLE_URL, mapOrigins, mapStyleUrl } from "../style"
import { LFOC, LFPN, R_ZONE, TMA_PARIS } from "@/test/fixtures/flight-plan"

describe("airspace overlay", () => {
  it("labels each area with its name, then ceiling over floor", () => {
    expect(airspaceLabel(TMA_PARIS)).toBe("TMA PARIS 1\nFL065 / 1500 ft AMSL")
    expect(airspaceLabel(R_ZONE)).toBe("R 45 A\n3000 ft AMSL / SFC")
  })

  it("colours by type: restricted red and dashed, TMA blue and dashed, prohibited filled", () => {
    const [tma, restricted] = airspaceFeatures([TMA_PARIS, R_ZONE]).features
    expect(tma.properties).toMatchObject({ type: "TMA", color: "#2563eb", dashed: true })
    expect(restricted.properties).toMatchObject({ type: "R", color: "#dc2626", dashed: true })
    const prohibited = airspaceFeatures([{ ...R_ZONE, id: "p", type: "P" }]).features[0]
    expect(prohibited.properties.dashed).toBe(false)
    expect(prohibited.properties.fillOpacity).toBeGreaterThan(restricted.properties.fillOpacity)
  })

  it("skips an area without geometry rather than failing", () => {
    expect(airspaceFeatures([{ ...TMA_PARIS, geometry: null }]).features).toEqual([])
    // Published without an outline (géométrie inconnue): empty coordinates, never drawn.
    expect(airspaceFeatures([{ ...TMA_PARIS, outlineKnown: false, geometry: { type: "MultiPolygon", coordinates: [] } }]).features).toEqual([])
  })

  it("draws solid and dashed borders on separate layers", () => {
    const layers = airspaceLayers()
    expect(layers.map((layer) => layer.id)).toEqual(["aero-airspaces-fill", "aero-airspaces-line", "aero-airspaces-line-dashed", "aero-airspaces-label"])
  })
})

describe("aerodromes, navaids and reporting points", () => {
  it("draws optional reporting points hollow and mandatory ones filled", () => {
    const features = navPointFeatures([
      { id: "vrp-n", type: "VRP", ident: "N", lat: 48.8, lon: 2.1, mandatory: true, aerodromeIcao: "LFPN" },
      { id: "vrp-w", type: "VRP", ident: "W", lat: 48.7, lon: 2, mandatory: false, aerodromeIcao: "LFPN" },
    ]).features
    expect(features.map((feature) => feature.properties.hollow)).toEqual([false, true])
    expect(features[0].geometry.coordinates).toEqual([2.1, 48.8])
  })
})

describe("aerodromes around the route", () => {
  it("leaves out the points of the route, which the route draws itself", () => {
    const features = navPointFeatures([LFPN, LFOC, { ...LFOC, id: "ap-lfoa", ident: "LFOA" }], ["LFPN", "LFOC"]).features
    expect(features.map((feature) => feature.properties.ident)).toEqual(["LFOA"])
  })

  it("draws them small when zoomed out, and names them only once there is room", () => {
    const [circle, label] = navPointLayers() as { minzoom?: number; paint: Record<string, unknown> }[]
    expect(circle.paint["circle-radius"]).toEqual(expect.arrayContaining(["interpolate", ["zoom"]]))
    expect(label.minzoom).toBe(9)
  })
})

describe("route overlay", () => {
  const points = [LFPN, { lat: 48.42, lon: 1.62 }, LFOC]

  it("puts an insertion handle in the middle of each leg", () => {
    expect(legMidpoints(points)).toEqual([
      { legIndex: 0, lat: (48.7519 + 48.42) / 2, lon: (2.1061 + 1.62) / 2 },
      { legIndex: 1, lat: (48.42 + 48.0581) / 2, lon: (1.62 + 1.3762) / 2 },
    ])
  })

  it("places TOC and TOD in proportion of the leg distances given by the API", () => {
    const toc = pointAlongRoute(points, [20, 30], 10)!
    expect(toc.lat).toBeCloseTo((48.7519 + 48.42) / 2, 6)
    const tod = pointAlongRoute(points, [20, 30], 50)!
    expect(tod).toEqual({ lat: 48.0581, lon: 1.3762 })
    expect(pointAlongRoute(points, [20], 10)).toBeNull()
  })

  it("draws the route, the alternate leg and the profile markers", () => {
    const collection = routeFeatures(points, { lat: 47.43, lon: 0.73 }, [
      { distanceNm: 5, altitudeFt: 2500, label: "TOC" },
      { distanceNm: 0, altitudeFt: 538, label: "LFPN" },
    ], [20, 30])
    expect(collection.features.map((feature) => (feature.properties as { kind: string }).kind)).toEqual(["route", "alternate", "profile"])
  })

  it("writes the magnetic course and distance along each leg", () => {
    const collection = routeFeatures(points, null, [], [20, 30], ["316° · 20 NM", "313° · 30 NM"])
    const legs = collection.features.filter((feature) => (feature.properties as { kind: string }).kind === "leg")
    expect(legs.map((feature) => (feature.properties as { label: string }).label)).toEqual(["316° · 20 NM", "313° · 30 NM"])
    expect(routeLayers().map((layer) => layer.id)).toContain("aero-route-leg-label")
    // Labels for another route (a computation not yet updated) are not drawn.
    expect(routeFeatures(points, null, [], [], ["316° · 20 NM"]).features).toHaveLength(1)
  })

  it("lightens the route on the dark base map", () => {
    const line = routeLayers("dark").find((layer) => layer.id === "aero-route-line") as { paint: Record<string, unknown> }
    expect(line.paint["line-color"]).toBe("#fb923c")
  })
})

describe("base map", () => {
  const ENV = { ...process.env }
  afterEach(() => {
    process.env = { ...ENV }
  })

  it("uses OpenFreeMap without any key by default, dark style in dark mode", () => {
    delete process.env.NEXT_PUBLIC_MAP_STYLE_URL
    delete process.env.NEXT_PUBLIC_MAP_STYLE_DARK_URL
    expect(mapStyleUrl("light")).toBe(DEFAULT_MAP_STYLE_URL)
    expect(mapStyleUrl("dark")).toBe(DEFAULT_MAP_STYLE_DARK_URL)
    expect(mapStyleUrl()).not.toMatch(/key|token/i)
    expect(mapOrigins()).toEqual(["https://tiles.openfreemap.org"])
  })

  it("switches to a self-hosted style for both themes when one is configured", () => {
    process.env.NEXT_PUBLIC_MAP_STYLE_URL = "/maps/france.json"
    expect(mapStyleUrl("dark")).toBe("/maps/france.json")
    expect(mapOrigins()).toEqual([])
  })
})

describe("map stylesheet", () => {
  it("underlines the links of the credits, which differ from the text by too little colour", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const css: string = require("fs").readFileSync(require("path").join(__dirname, "..", "aero-map.css"), "utf8")
    expect(css).toMatch(/\.maplibregl-ctrl-attrib a\s*\{[^}]*text-decoration:\s*underline/)
  })
})
