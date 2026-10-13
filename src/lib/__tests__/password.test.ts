import { PASSWORD_MIN_LENGTH, newPasswordError } from "../password"

describe("newPasswordError", () => {
  it("accepts a long enough password typed twice", () => {
    expect(newPasswordError("nouveau-secret", "nouveau-secret")).toBeNull()
  })

  it("asks for both fields", () => {
    expect(newPasswordError("", "")).toBe("Veuillez remplir tous les champs.")
    expect(newPasswordError("nouveau-secret", "")).toBe("Veuillez remplir tous les champs.")
  })

  // The rule was 8 characters: "neuf-cara" (9) used to pass.
  it("refuses a password shorter than the API accepts", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10)
    expect(newPasswordError("court", "court")).toBe("Le mot de passe doit contenir au moins 10 caractères.")
    expect(newPasswordError("neuf-cara", "neuf-cara")).toBe("Le mot de passe doit contenir au moins 10 caractères.")
    expect(newPasswordError("dix-caract", "dix-caract")).toBeNull()
  })

  it("refuses two different entries", () => {
    expect(newPasswordError("nouveau-secret", "nouveau-secrex")).toBe("Les mots de passe ne correspondent pas.")
  })
})
