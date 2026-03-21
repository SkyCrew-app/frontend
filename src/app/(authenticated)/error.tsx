"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Authenticated route error:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-lg border-destructive/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <CardTitle className="text-xl">Une erreur est survenue</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            La page a rencontré un problème inattendu. Vous pouvez réessayer ou retourner au tableau de bord.
          </p>
          {process.env.NODE_ENV === "development" && (
            <details className="mt-4 rounded-md bg-muted/50 p-3 text-left">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Détails techniques
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs font-mono text-destructive">
                {error.message}
              </pre>
              {error.digest && (
                <p className="mt-1 text-xs text-muted-foreground">Digest : {error.digest}</p>
              )}
            </details>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-3">
          <Button onClick={reset} variant="default" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Réessayer
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              Tableau de bord
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
