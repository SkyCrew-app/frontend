import {
  appendWaypoint,
  emptyRoute,
  insertWaypoint,
  moveWaypoint,
  parseCoordinates,
  removeWaypoint,
  renameWaypoint,
  reorderWaypoint,
  routeFromSaved,
  routePointFromNavPoint,
  setAllAltitudes,
  setDeparture,
  setDestination,
  setLegAltitude,
  setLegWind,
  toLegInputs,
  toRoutePointInput,
  userPoint,
  type RouteDraft,
} from "../route"
import { LFOC, LFOT, LFPN, P1, RBT, SAVED_PLAN } from "@/test/fixtures/flight-plan"

const base = (): RouteDraft =>
  setDestination(setDeparture(emptyRoute(2500), routePointFromNavPoint(LFPN)), routePointFromNavPoint(LFOC))

const idents = (route: RouteDraft) => route.waypoints.map((point) => point.ident)
const invariant = (route: RouteDraft) => expect(route.legs).toHaveLength(route.waypoints.length + 1)

describe("route editing", () => {
  it("starts direct: one leg at the cruise altitude", () => {
    const route = base()
    expect(route.waypoints).toEqual([])
    expect(route.legs).toEqual([{ altitudeFt: 2500 }])
  })

  it("adds points before the destination, each new leg keeping the last altitude", () => {
    let route = setLegAltitude(base(), 0, 3500)
    route = appendWaypoint(route, routePointFromNavPoint(RBT))
    route = appendWaypoint(route, userPoint(route, 48.42, 1.62))
    expect(idents(route)).toEqual(["RBT", "P1"])
    expect(route.legs.map((leg) => leg.altitudeFt)).toEqual([3500, 3500, 3500])
    invariant(route)
  })

  it("inserts a point inside a leg: both halves keep the altitude of the split leg", () => {
    let route = appendWaypoint(base(), routePointFromNavPoint(RBT))
    route = setLegAltitude(route, 0, 2000)
    route = setLegAltitude(route, 1, 4500)
    route = insertWaypoint(route, 1, userPoint(route, 48.42, 1.62))
    expect(idents(route)).toEqual(["RBT", "P1"])
    expect(route.legs.map((leg) => leg.altitudeFt)).toEqual([2000, 4500, 4500])
    invariant(route)
  })

  it("removes a point by merging its two legs", () => {
    let route = appendWaypoint(appendWaypoint(base(), routePointFromNavPoint(RBT)), userPoint(base(), 48.42, 1.62))
    route = setLegAltitude(setLegAltitude(setLegAltitude(route, 0, 2000), 1, 3000), 2, 4000)
    route = removeWaypoint(route, 0)
    expect(idents(route)).toEqual(["P1"])
    expect(route.legs.map((leg) => leg.altitudeFt)).toEqual([2000, 4000])
    invariant(route)
    expect(removeWaypoint(route, 5)).toBe(route)
  })

  it("reorders points while altitudes stay with the leg positions", () => {
    let route = appendWaypoint(appendWaypoint(base(), routePointFromNavPoint(RBT)), userPoint(base(), 48.42, 1.62))
    route = setLegAltitude(route, 0, 2000)
    route = reorderWaypoint(route, 0, 1)
    expect(idents(route)).toEqual(["P1", "RBT"])
    expect(route.legs[0].altitudeFt).toBe(2000)
    invariant(route)
  })

  it("turns a dragged published point into a point of the pilot, at the new position", () => {
    let route = appendWaypoint(base(), routePointFromNavPoint(RBT))
    route = moveWaypoint(route, 0, 48.6512345, 1.9912345)
    expect(route.waypoints[0]).toEqual({ type: "USER", ident: "P1", name: "P1", lat: 48.65123, lon: 1.99123 })
    // A point of the pilot keeps its name when dragged again.
    route = renameWaypoint(route, 0, "Château")
    route = moveWaypoint(route, 0, 48.7, 2)
    expect(route.waypoints[0]).toMatchObject({ ident: "Château", lat: 48.7, lon: 2 })
  })

  it("names new points P1, P2… without reusing a name", () => {
    let route = appendWaypoint(base(), userPoint(base(), 48, 1))
    route = appendWaypoint(route, userPoint(route, 48.1, 1.1))
    expect(idents(route)).toEqual(["P1", "P2"])
    route = removeWaypoint(route, 0)
    expect(userPoint(route, 48.2, 1.2).ident).toBe("P1")
  })

  it("sets every altitude at once and a typed wind on one leg", () => {
    let route = appendWaypoint(base(), routePointFromNavPoint(RBT))
    route = setAllAltitudes(route, 4500)
    route = setLegWind(route, 1, { directionDeg: 270, speedKt: 20 })
    expect(toLegInputs(route)).toEqual([
      { altitudeFt: 4500, cruiseSetting: null, windOverride: null },
      { altitudeFt: 4500, cruiseSetting: null, windOverride: { directionDeg: 270, speedKt: 20 } },
    ])
  })

  it("sends our points by id and the pilot's points by coordinates", () => {
    expect(toRoutePointInput(routePointFromNavPoint(RBT))).toEqual({ navPointId: "nav-rbt" })
    expect(toRoutePointInput(userPoint(base(), 48.42, 1.62, "Ferme"))).toEqual({ lat: 48.42, lon: 1.62, name: "Ferme" })
  })

  it("rebuilds the route of a saved plan from its legs", () => {
    const route = routeFromSaved(SAVED_PLAN.input, SAVED_PLAN.result.legs, SAVED_PLAN.result.alternateLeg)
    expect(route.departure?.ident).toBe("LFPN")
    expect(route.destination?.ident).toBe("LFOC")
    expect(route.alternate?.ident).toBe(LFOT.ident)
    expect(idents(route)).toEqual(["RBT", P1.ident])
    expect(route.waypoints[1].navPointId).toBeUndefined()
    invariant(route)
  })
})

describe("coordinates typed in the search", () => {
  it.each([
    ["48.7519 2.1061", { lat: 48.7519, lon: 2.1061 }],
    ["48,4479; -4,4185", { lat: 48.4479, lon: -4.4185 }],
    ["48.4479, -4.4185", { lat: 48.4479, lon: -4.4185 }],
  ])("reads decimal degrees %s", (text, expected) => {
    expect(parseCoordinates(text)).toEqual(expected)
  })

  it("reads degrees, minutes and seconds", () => {
    const point = parseCoordinates(`48°45'07"N 002°06'22"E`)!
    expect(point.lat).toBeCloseTo(48.7519, 4)
    expect(point.lon).toBeCloseTo(2.1061, 4)
    const west = parseCoordinates("4826N 00425W")!
    expect(west.lat).toBeCloseTo(48.4333, 4)
    expect(west.lon).toBeCloseTo(-4.4167, 4)
  })

  it.each(["LFPN", "Toussus", "95 200", "48.5"])("ignores %s", (text) => {
    expect(parseCoordinates(text)).toBeNull()
  })
})
