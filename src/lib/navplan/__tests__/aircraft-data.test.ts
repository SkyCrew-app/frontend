import {
  DEFAULT_SETTINGS,
  emptyMassBalanceInput,
  makeId,
  massBalanceForSave,
  massBalanceInput,
  massBalanceProblems,
  performanceForSave,
  performanceInput,
  performanceProblems,
  settingsProblems,
} from "../aircraft-data"
import { aircraftDataState, missingAircraftData } from "../status"
import { MASS_BALANCE, PERFORMANCE } from "@/test/fixtures/flight-plan"

describe("club fuel policy", () => {
  it("defaults to the values of AMC1 NCO.OP.125(b) and no club extra", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      reserveVfrDayLocalMin: 10,
      reserveVfrDayMin: 30,
      reserveVfrNightMin: 45,
      contingencyPercent: 0,
      contingencyMinL: 0,
      alternateRequiredVfr: false,
      clubMarginMin: 0,
    })
    expect(settingsProblems(DEFAULT_SETTINGS)).toEqual([])
  })

  it("refuses a reserve below the AMC (case 8 of the design: 20 min in VFR by day)", () => {
    expect(settingsProblems({ ...DEFAULT_SETTINGS, reserveVfrDayMin: 20 })).toEqual(["reserveVfrDayMin"])
    expect(settingsProblems({ ...DEFAULT_SETTINGS, reserveVfrNightMin: 40, reserveVfrDayLocalMin: 5 })).toEqual([
      "reserveVfrDayLocalMin",
      "reserveVfrNightMin",
    ])
  })

  it("accepts a stricter club rule", () => {
    expect(settingsProblems({ ...DEFAULT_SETTINGS, reserveVfrDayMin: 45, contingencyPercent: 10, clubMarginMin: 15 })).toEqual([])
    expect(settingsProblems({ ...DEFAULT_SETTINGS, contingencyPercent: -1, clubMarginMin: Number.NaN })).toEqual([
      "contingencyPercent",
      "clubMarginMin",
    ])
  })
})

describe("mass and balance editor", () => {
  it("starts from the weights already known for the aircraft", () => {
    expect(Number.isNaN(emptyMassBalanceInput(560, 1000).emptyArmM)).toBe(true)
    expect(emptyMassBalanceInput(560, 1000)).toMatchObject({ emptyMassKg: 560, mtowKg: 1000, mlwKg: 1000, envelopes: [{ category: "NORMAL", points: [] }] })
  })

  it("finds nothing to correct in F-TEST", () => {
    expect(massBalanceProblems(massBalanceInput(MASS_BALANCE), ["main"])).toEqual([])
    // A template applied before the weighing has no empty arm: it is asked for, not taken as 0.
    expect(massBalanceProblems(massBalanceInput({ ...MASS_BALANCE, emptyArmM: null }), ["main"])).toEqual([{ code: "EMPTY_ARM" }])
  })

  it("lists what is missing or inconsistent", () => {
    const input = {
      ...massBalanceInput(MASS_BALANCE),
      emptyMassKg: 0,
      weighingDate: "",
      mlwKg: 1100,
      stations: [...MASS_BALANCE.stations, { id: "fuel-aux", label: "", kind: "FUEL" as const, armM: 1, maxKg: null, tankId: "aux" }],
      envelopes: [{ category: "NORMAL" as const, points: MASS_BALANCE.envelopes[0].points.slice(0, 2) }],
    }
    expect(massBalanceProblems(input, ["main"]).map((problem) => problem.code)).toEqual([
      "EMPTY_MASS",
      "WEIGHING_DATE",
      "MLW_ABOVE_MTOW",
      "STATION_LABEL",
      "STATION_TANK",
      "ENVELOPE",
    ])
  })

  it("keeps the weighing date as a day in the form and sends it as an instant", () => {
    const input = massBalanceInput(MASS_BALANCE)
    expect(input.weighingDate).toBe("2026-03-12")
    expect(massBalanceForSave(input).weighingDate).toBe("2026-03-12T00:00:00.000Z")
    expect(JSON.stringify(input)).not.toContain("__typename")
    expect(input).not.toHaveProperty("validatedAt")
  })

  it("gives new stations a readable, unique id", () => {
    expect(makeId("Siège arrière", [])).toBe("siege-arriere")
    expect(makeId("Siège arrière", ["siege-arriere"])).toBe("siege-arriere-2")
    expect(makeId("***", [])).toBe("item")
  })
})

describe("performance editor", () => {
  it("finds nothing to correct in F-TEST and drops the read-only fields", () => {
    const input = performanceInput({ ...PERFORMANCE, __typename: "AircraftPerformance" } as typeof PERFORMANCE)
    expect(performanceProblems(input)).toEqual([])
    expect(input).not.toHaveProperty("validatedBy")
    expect(input).not.toHaveProperty("aircraftId")
    expect(JSON.stringify(input)).not.toContain("__typename")
  })

  it("starts an aircraft without data from its fuel capacity, with nothing invented", () => {
    const input = performanceInput(null, 110, "Réservoir principal")
    expect(input.fuel.tanks).toEqual([{ id: "main", label: "Réservoir principal", usableL: 110, unusableL: 0, armM: 0 }])
    expect(input.cruise.rows).toEqual([])
    expect(performanceProblems(input).map((problem) => problem.code)).toEqual(["CLIMB", "CRUISE", "NORMAL_SETTING", "DESCENT", "RESERVE"])
  })

  it("sends an empty climb table as no table", () => {
    const input = performanceInput(PERFORMANCE)
    expect(performanceForSave({ ...input, climb: { ...input.climb, table: [] }, source: "  " })).toMatchObject({ climb: { table: null }, source: null })
  })
})

describe("aircraft data state", () => {
  it("is usable only once complete and confirmed", () => {
    expect(aircraftDataState(null, null)).toBe("MISSING")
    expect(aircraftDataState(PERFORMANCE, { ...MASS_BALANCE, envelopes: [] })).toBe("INCOMPLETE")
    expect(aircraftDataState(PERFORMANCE, { ...MASS_BALANCE, validatedAt: null })).toBe("NOT_VALIDATED")
    expect(aircraftDataState(PERFORMANCE, MASS_BALANCE)).toBe("VALIDATED")
  })

  it("says what is missing", () => {
    expect(missingAircraftData(null, { ...MASS_BALANCE, emptyArmM: null, weighingDate: null })).toEqual(
      expect.arrayContaining(["emptyArm", "weighingDate", "tanks", "cruise", "reserve"]),
    )
  })
})
