import { durationTicks } from "../duration-ticks"

describe("durationTicks", () => {
  it("prend des pas ronds, en minutes puis en heures", () => {
    expect(durationTicks(0.3)).toEqual([0, 0.167, 0.333])
    expect(durationTicks(1.6)).toEqual([0, 0.5, 1, 1.5, 2])
    expect(durationTicks(7)).toEqual([0, 2, 4, 6, 8])
  })

  it("garde un axe lisible sans heures", () => {
    expect(durationTicks(0)).toEqual([0, 0.25, 0.5, 0.75, 1])
  })
})
