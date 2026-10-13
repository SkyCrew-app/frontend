import fr from "../fr/instruction.json"
import en from "../en/instruction.json"

type Tree = { [key: string]: Tree | string }

// Every leaf of a locale file as "a.b.c" → text.
const leaves = (tree: Tree, prefix = ""): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>((all, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === "string" ? { ...all, [path]: value } : { ...all, ...leaves(value, path) }
  }, {})

const variables = (text: string) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]).sort()

describe("instruction locale files", () => {
  const french = leaves(fr)
  const english = leaves(en)

  it("has the same keys in French and in English", () => {
    expect(Object.keys(english).sort()).toEqual(Object.keys(french).sort())
  })

  it("has no empty text", () => {
    for (const [key, text] of [...Object.entries(french), ...Object.entries(english)]) {
      expect(`${key}: ${text.trim()}`).not.toBe(`${key}: `)
    }
  })

  it("uses the same variables in both languages", () => {
    for (const key of Object.keys(french)) {
      expect(`${key}: ${variables(english[key] ?? "")}`).toBe(`${key}: ${variables(french[key])}`)
    }
  })
})
