// Shortest password the API accepts.
export const PASSWORD_MIN_LENGTH = 8

// What is wrong with a new password typed twice, or null when it can be sent.
export function newPasswordError(password: string, confirmation: string): string | null {
  if (!password || !confirmation) return "Veuillez remplir tous les champs."
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`
  }
  if (password !== confirmation) return "Les mots de passe ne correspondent pas."
  return null
}
