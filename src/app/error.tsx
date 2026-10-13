"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { AuthCard } from "@/app/auth/_components/AuthCard"

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useTranslation("auth")

  useEffect(() => {
    console.error("Root error:", error)
  }, [error])

  return (
    <AuthCard
      icon={AlertTriangle}
      tone="danger"
      title={t("error.page.title")}
      description={t("error.page.description")}
      footer={error.digest ? t("error.reference", { digest: error.digest }) : undefined}
    >
      <Button onClick={reset} className="w-full">
        <RefreshCw className="h-4 w-4" />
        {t("common:actions.retry")}
      </Button>
    </AuthCard>
  )
}
