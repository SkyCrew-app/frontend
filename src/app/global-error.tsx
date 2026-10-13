"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthCard } from "@/app/auth/_components/AuthCard"
import i18n, { currentLanguage } from "@/lib/i18n"
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
    <html lang={currentLanguage()} suppressHydrationWarning>
      <body className="bg-background font-sans text-foreground antialiased">
        <AuthCard
          icon={AlertTriangle}
          tone="danger"
          title={i18n.t("auth:error.global.title")}
          description={i18n.t("auth:error.global.description")}
          footer={error.digest ? i18n.t("auth:error.reference", { digest: error.digest }) : undefined}
        >
          <Button onClick={reset} className="w-full">
            <RefreshCw className="h-4 w-4" />
            {i18n.t("common:actions.retry")}
          </Button>
        </AuthCard>
      </body>
    </html>
  )
}
