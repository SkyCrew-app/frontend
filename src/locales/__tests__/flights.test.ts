import fr from "@/locales/fr/flights.json"
import en from "@/locales/en/flights.json"

type Tree = { [key: string]: string | Tree }

const keysOf = (tree: Tree, prefix = ""): string[] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : keysOf(value, `${prefix}${key}.`),
  )

const emptyValues = (tree: Tree, prefix = ""): string[] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? (value.trim() ? [] : [`${prefix}${key}`]) : emptyValues(value, `${prefix}${key}.`),
  )

describe("flights translations", () => {
  it("has the same keys in French and in English", () => {
    expect(keysOf(en).sort()).toEqual(keysOf(fr).sort())
  })

  it("has no empty text", () => {
    expect(emptyValues(fr)).toEqual([])
    expect(emptyValues(en)).toEqual([])
  })
})
