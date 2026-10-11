import { newPasswordError } from "../password"

describe("newPasswordError", () => {
  it("accepts a long enough password typed twice", () => {
    expect(newPasswordError("nouveau-secret", "nouveau-secret")).toBeNull()
  })

  it("asks for both fields", () => {
    expect(newPasswordError("", "")).toBe("Veuillez remplir tous les champs.")
    expect(newPasswordError("nouveau-secret", "")).toBe("Veuillez remplir tous les champs.")
  })

  it("refuses a password shorter than the API accepts", () => {
    expect(newPasswordError("court", "court")).toBe("Le mot de passe doit contenir au moins 8 caractères.")
  })

  it("refuses two different entries", () => {
    expect(newPasswordError("nouveau-secret", "nouveau-secrex")).toBe("Les mots de passe ne correspondent pas.")
  })
})
