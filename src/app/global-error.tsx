"use client"

import { useEffect } from "react"

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
      <body className="bg-[hsl(216,30%,96%)] text-[hsl(214,52%,15%)] font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center p-6">
          <div className="w-full max-w-md rounded-lg border border-[hsl(215,20%,88%)] bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="mb-2 text-2xl font-bold">Erreur critique</h1>
            <p className="mb-6 text-[hsl(215,16%,47%)]">
              Une erreur inattendue s&apos;est produite. L&apos;application a rencontré un problème critique.
            </p>
            {error.digest && (
              <p className="mb-4 text-xs text-[hsl(215,16%,47%)]">
                Référence : {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              className="rounded-md bg-[hsl(214,52%,25%)] px-6 py-2.5 text-sm font-medium text-white shadow hover:bg-[hsl(214,52%,30%)] transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
