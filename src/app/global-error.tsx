"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthCard } from "@/app/auth/_components/AuthCard"
// This page replaces the root layout: it has to bring the styles itself.
import "./globals.css"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <html lang="fr">
      <body className="bg-background font-sans text-foreground antialiased">
        <AuthCard
          icon={AlertTriangle}
          tone="danger"
          title="L'application a rencontré un problème"
          description="Une erreur inattendue empêche l'affichage. Réessayez ; si le problème persiste, contactez un administrateur du club."
          footer={error.digest ? `Référence de l'erreur : ${error.digest}` : undefined}
        >
          <Button onClick={reset} className="w-full">
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </AuthCard>
      </body>
    </html>
  )
}
