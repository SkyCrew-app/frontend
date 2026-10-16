import fr from "@/locales/fr/navplan.json"
import en from "@/locales/en/navplan.json"

type Tree = { [key: string]: string | Tree }

const entries = (tree: Tree, prefix = ""): [string, string][] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [[`${prefix}${key}`, value] as [string, string]] : entries(value, `${prefix}${key}.`),
  )

const variables = (text: string) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]).sort()

describe("navplan translations", () => {
  it("has the same keys in French and in English", () => {
    expect(entries(en).map(([key]) => key).sort()).toEqual(entries(fr).map(([key]) => key).sort())
  })

  it("has no empty text", () => {
    expect(entries(fr).filter(([, value]) => !value.trim())).toEqual([])
    expect(entries(en).filter(([, value]) => !value.trim())).toEqual([])
  })

  it("uses the same variables in both languages", () => {
    const english = Object.fromEntries(entries(en))
    const mismatches = entries(fr).filter(([key, value]) => variables(value).join() !== variables(english[key] ?? "").join())
    expect(mismatches).toEqual([])
  })

  it("carries the safety mentions of the design word for word", () => {
    expect(fr.disclaimer.preparation).toBe(
      "Aide à la préparation du vol. Ne remplace ni les publications aéronautiques officielles (AIP, SUP AIP, NOTAM, cartes VAC), ni le manuel de vol de l'avion, ni le jugement du commandant de bord.",
    )
    expect(fr.massBalance.verdict.out).toBe("HORS LIMITES — NE PAS PARTIR")
    expect(fr.crossings.unknownIsNotInactive).toContain("Activité inconnue ≠ zone inactive")
  })
})
