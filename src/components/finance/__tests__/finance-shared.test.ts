import { expenseCategoryLabel, formatPercentChange, formatShare, percentChange } from "../finance-shared"

describe("finance-shared", () => {
  it("doit donner un libellé français aux catégories connues", () => {
    expect(expenseCategoryLabel("carburant")).toBe("Carburant")
    expect(expenseCategoryLabel("MAINTENANCE")).toBe("Maintenance")
  })

  it("ne doit jamais afficher un code brut pour une catégorie inconnue ou absente", () => {
    expect(expenseCategoryLabel("FRAIS_BANCAIRES")).toBe("Frais bancaires")
    expect(expenseCategoryLabel(null)).toBe("Sans catégorie")
  })

  it("doit calculer l'évolution par rapport à la valeur absolue précédente", () => {
    expect(percentChange(100, 150)).toBe(50)
    // From a loss of 100 to a profit of 100: an improvement, not a drop.
    expect(percentChange(-100, 100)).toBe(200)
  })

  it("ne doit pas diviser par zéro", () => {
    expect(percentChange(0, 50)).toBeNull()
    expect(percentChange(undefined, 50)).toBeNull()
    expect(formatPercentChange(null)).toBe("—")
    expect(formatShare(10, 0)).toBe("—")
  })

  it("doit signer les évolutions positives", () => {
    expect(formatPercentChange(12.54)).toBe("+12,5 %")
    expect(formatPercentChange(-3)).toBe("-3 %")
  })
})
