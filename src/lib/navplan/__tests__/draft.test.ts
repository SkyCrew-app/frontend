import { draftFromPlan, draftIssues, emptyDraft, fromLocalInputValue, isComputable, toFlightPlanInput, toLocalInputValue, withAircraftStations } from "../draft"
import { appendWaypoint, emptyRoute, routePointFromNavPoint, setDeparture, setDestination, setLegAltitude, userPoint } from "../route"
import { LFOC, LFPN, MASS_BALANCE, PERFORMANCE, RBT, SAVED_PLAN } from "@/test/fixtures/flight-plan"

const route = () => {
  const start = setDestination(setDeparture(emptyRoute(), routePointFromNavPoint(LFPN)), routePointFromNavPoint(LFOC))
  return appendWaypoint(appendWaypoint(start, routePointFromNavPoint(RBT)), userPoint(start, 48.42, 1.62))
}

const ready = () =>
  emptyDraft({
    aircraftId: 7,
    reservationId: 55,
    departureTime: "2026-10-17T09:00:00.000Z",
    route: route(),
    loads: { front: 160, rear: 75, baggage: 10 },
    fuel: { main: 80 },
  })

const codes = (draft = ready()) => draftIssues(draft).map((issue) => issue.code)

describe("what the builder checks before asking the API", () => {
  it("asks nothing while the departure or the destination is missing", () => {
    const draft = emptyDraft({ aircraftId: 7 })
    expect(codes(draft)).toEqual(expect.arrayContaining(["DEPARTURE_MISSING", "DESTINATION_MISSING"]))
    expect(isComputable(draftIssues(draft))).toBe(false)
    expect(toFlightPlanInput(draft)).toBeNull()
  })

  it("refuses an altitude out of range on the leg concerned", () => {
    const draft = { ...ready(), route: setLegAltitude(route(), 1, 25000) }
    expect(draftIssues(draft)).toContainEqual({ code: "ALTITUDE_INVALID", blocking: true, target: 1 })
    expect(toFlightPlanInput(draft)).toBeNull()
  })

  it("refuses a QNH out of 940–1060 hPa, and a negative mass or fuel", () => {
    expect(codes({ ...ready(), qnhHpa: 870 })).toContain("QNH_INVALID")
    expect(codes({ ...ready(), loads: { front: -5 } })).toContain("LOAD_INVALID")
    expect(codes({ ...ready(), fuel: { main: -1 } })).toContain("FUEL_INVALID")
  })

  it("computes without fuel, but says it", () => {
    const draft = { ...ready(), fuel: { main: null } }
    expect(draftIssues(draft)).toContainEqual({ code: "FUEL_MISSING", blocking: false })
    expect(toFlightPlanInput(draft)).not.toBeNull()
  })

  it("flags an aircraft whose data an administrator has not confirmed", () => {
    const issues = draftIssues(ready(), {
      performance: { ...PERFORMANCE, validatedAt: null },
      massBalance: { ...MASS_BALANCE, validatedAt: null },
    }).map((issue) => issue.code)
    expect(issues).toEqual(expect.arrayContaining(["MASS_BALANCE_NOT_VALIDATED", "PERFORMANCE_NOT_VALIDATED"]))
  })

  it("builds the input of the contract: ids for our points, coordinates for the pilot's, one leg more than points", () => {
    const input = toFlightPlanInput({ ...ready(), loads: { front: 160, rear: null, baggage: 10 } })!
    expect(input).toEqual({
      aircraftId: 7,
      reservationId: 55,
      departureTime: "2026-10-17T09:00:00.000Z",
      departure: { navPointId: "ap-lfpn" },
      destination: { navPointId: "ap-lfoc" },
      alternate: null,
      waypoints: [{ navPointId: "nav-rbt" }, { lat: 48.42, lon: 1.62, name: "P1" }],
      legs: [
        { altitudeFt: 2500, cruiseSetting: null, windOverride: null },
        { altitudeFt: 2500, cruiseSetting: null, windOverride: null },
        { altitudeFt: 2500, cruiseSetting: null, windOverride: null },
      ],
      reserveCase: "VFR_DAY",
      qnhHpa: null,
      loads: [
        { stationId: "front", massKg: 160 },
        { stationId: "baggage", massKg: 10 },
      ],
      fuel: [{ tankId: "main", liters: 80 }],
      envelopeCategory: "NORMAL",
      extraFuelNote: null,
    })
    expect(input.legs).toHaveLength(input.waypoints.length + 1)
  })

  it("prepares one field per seat, baggage area and tank of the aircraft, keeping what was typed", () => {
    const draft = withAircraftStations({ ...ready(), loads: { front: 160, gone: 3 } }, MASS_BALANCE, PERFORMANCE)
    expect(draft.loads).toEqual({ front: 160, rear: null, baggage: null })
    expect(draft.fuel).toEqual({ main: 80 })
  })

  it("re-opens a saved plan as it was entered", () => {
    const draft = draftFromPlan(SAVED_PLAN)
    expect(draft.reservationId).toBe(55)
    expect(draft.loads).toEqual({ front: 160, rear: 75, baggage: 10 })
    expect(draft.fuel).toEqual({ main: 80 })
    expect(draft.route.alternate?.ident).toBe("LFOT")
    expect(toFlightPlanInput(draft)?.waypoints).toEqual(SAVED_PLAN.input.waypoints)
  })

  it("converts the departure time between the local input and UTC", () => {
    const iso = fromLocalInputValue("2026-10-17T11:00")
    expect(toLocalInputValue(iso)).toBe("2026-10-17T11:00")
    expect(fromLocalInputValue("")).toBe("")
  })
})
