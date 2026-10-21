import { defaultFlightType, flightTypeLabel, flightTypeOptions, toFlightType } from "../flight-type"

describe("flight type: the category of the flight", () => {
  it("offers the reservation categories, stored in lower case", () => {
    expect(flightTypeOptions().map((option) => option.value)).toEqual([
      "local",
      "cross_country",
      "instruction",
      "tourism",
      "training",
      "maintenance",
      "private",
      "corporate",
    ])
    expect(flightTypeOptions()[1].label).toBe("Navigation")
  })

  it("reads a category in any case and nothing else", () => {
    expect(toFlightType("CROSS_COUNTRY")).toBe("cross_country")
    expect(toFlightType("VFR")).toBeUndefined()
    expect(toFlightType(null)).toBeUndefined()
  })

  it("starts from the plan, then the reservation, then local", () => {
    expect(defaultFlightType("training", "LOCAL")).toBe("training")
    expect(defaultFlightType("VFR", "TOURISM")).toBe("tourism")
    expect(defaultFlightType("IFR", null)).toBe("local")
  })

  it("shows the translated category, and an unknown value as it is", () => {
    expect(flightTypeLabel("instruction")).toBe("Instruction")
    expect(flightTypeLabel("VFR")).toBe("VFR")
    expect(flightTypeLabel(undefined)).toBe("—")
  })
})
