"use client"

import { useState, useEffect } from "react"
import { WifiOff } from "lucide-react"

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="bg-warning text-warning-foreground px-4 py-2 text-sm flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      Mode hors-ligne &mdash; les donn&eacute;es affich&eacute;es peuvent ne pas &ecirc;tre &agrave; jour
    </div>
  )
}
