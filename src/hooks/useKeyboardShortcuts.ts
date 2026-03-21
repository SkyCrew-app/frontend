"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

export function useKeyboardShortcuts() {
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const router = useRouter()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      // Cmd+K — toggle command palette
      if (mod && e.key === "k") {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
        return
      }

      // Cmd+Shift+N — new reservation
      if (mod && e.shiftKey && e.key === "N") {
        e.preventDefault()
        router.push("/reservations")
        return
      }

      // Cmd+Shift+L — logbook
      if (mod && e.shiftKey && e.key === "L") {
        e.preventDefault()
        router.push("/logbook")
        return
      }
    },
    [router],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return { isCommandPaletteOpen, setCommandPaletteOpen }
}
