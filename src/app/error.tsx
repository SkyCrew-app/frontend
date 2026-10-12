"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthCard } from "@/app/auth/_components/AuthCard"

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Root error:", error)
  }, [error])

  return (
    <AuthCard
      icon={AlertTriangle}
      tone="danger"
      title="Une erreur est survenue"
      description="La page n'a pas pu s'afficher. Réessayez ; si le problème persiste, contactez un administrateur du club."
      footer={error.digest ? `Référence de l'erreur : ${error.digest}` : undefined}
    >
      <Button onClick={reset} className="w-full">
        <RefreshCw className="h-4 w-4" />
        Réessayer
      </Button>
    </AuthCard>
  )
}
