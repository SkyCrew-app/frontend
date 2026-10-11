import { base64ToBytes } from "../download"

describe("base64ToBytes", () => {
  it("gives back the bytes of the file", () => {
    // "%PDF-" in base64
    expect(Array.from(base64ToBytes("JVBERi0="))).toEqual([0x25, 0x50, 0x44, 0x46, 0x2d])
  })

  it("copes with an empty file", () => {
    expect(base64ToBytes("")).toHaveLength(0)
  })
})
