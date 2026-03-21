"use client"

import { useEffect } from "react"

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Oups, quelque chose a mal tourné</h1>
        <p className="mb-6 text-muted-foreground">
          Une erreur inattendue s&apos;est produite. Veuillez réessayer.
        </p>
        {error.digest && (
          <p className="mb-4 text-xs text-muted-foreground">
            Référence : {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
