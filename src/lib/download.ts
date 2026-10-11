// Bytes of a file the API returned encoded in base64.
export function base64ToBytes(base64: string): Uint8Array {
  const characters = atob(base64)
  const bytes = new Uint8Array(characters.length)
  for (let i = 0; i < characters.length; i++) {
    bytes[i] = characters.charCodeAt(i)
  }
  return bytes
}

// Saves a PDF the API returned in base64 under the given name.
export function downloadBase64Pdf(base64: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([base64ToBytes(base64)], { type: "application/pdf" }))
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
