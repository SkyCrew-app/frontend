import fr from "../fr/nav.json"
import en from "../en/nav.json"

type Tree = { [key: string]: string | Tree }

// Every leaf as "path.to.key" → text.
const leaves = (tree: Tree, prefix = ""): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>((all, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === "string" ? { ...all, [path]: value } : { ...all, ...leaves(value, path) }
  }, {})

const variables = (text: string) => (text.match(/{{\s*\w+\s*}}/g) ?? []).sort()

describe("nav translations", () => {
  const french = leaves(fr)
  const english = leaves(en)

  it("has the same keys in French and in English", () => {
    expect(Object.keys(english).sort()).toEqual(Object.keys(french).sort())
  })

  it("has no empty text", () => {
    for (const [key, text] of [...Object.entries(french), ...Object.entries(english)]) {
      expect([key, text.trim() !== ""]).toEqual([key, true])
    }
  })

  it("uses the same variables in both languages", () => {
    for (const key of Object.keys(french)) {
      expect([key, variables(english[key] ?? "")]).toEqual([key, variables(french[key])])
    }
  })
})
