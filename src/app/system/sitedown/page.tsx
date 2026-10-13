"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, RefreshCw, ServerOff, WifiOff } from "lucide-react"
import { Trans, useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { getGraphqlUrl, withBasePath } from "@/lib/runtime-config"
import { AuthCard, AuthCardSkeleton } from "@/app/auth/_components/AuthCard"

type PageState = "loading" | "error" | "unavailable" | "available"

export default function SiteDownPage() {
  const { t } = useTranslation("auth")
  const [pageState, setPageState] = useState<PageState>("loading")
  const [countdown, setCountdown] = useState(30)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Ask the server whether the service is back.
  useEffect(() => {
    const checkServiceStatus = async () => {
      try {
        const response = await fetch(getGraphqlUrl(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            query: `
              query GetSiteStatus {
                getSiteStatus
              }
            `,
          }),
        })

        if (!response.ok) {
          throw new Error(`Erreur réseau: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()

        if (result.errors) {
          throw new Error(result.errors[0]?.message || "Erreur GraphQL inconnue")
        }

        if (result.data?.getSiteStatus === "available") {
          setPageState("available")

          // Leave a moment to read the message, then go back to the site.
          setTimeout(() => {
            window.location.href = withBasePath("/")
          }, 2000)
        } else {
          setPageState("unavailable")
        }
      } catch (err) {
        console.error("Erreur lors de la vérification du statut:", err)
        setPageState("error")
      }
    }

    checkServiceStatus()
  }, [])

  // Countdown to the automatic retry.
  useEffect(() => {
    if (pageState !== "unavailable") return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleRefresh()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [pageState])

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  if (pageState === "loading") return <AuthCardSkeleton />

  if (pageState === "error") {
    return (
      <AuthCard
        icon={WifiOff}
        tone="danger"
        title={t("system.siteDown.error.title")}
        description={t("system.siteDown.error.description")}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/">{t("common.backToSignIn")}</Link>
          </Button>
          <Button className="w-full" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {t("common:actions.retry")}
          </Button>
        </div>
      </AuthCard>
    )
  }

  if (pageState === "available") {
    return (
      <AuthCard
        icon={CheckCircle2}
        tone="success"
        title={t("system.siteDown.available.title")}
        description={t("system.siteDown.available.description")}
      >
        <div className="flex justify-center" role="status" aria-label={t("system.siteDown.available.redirecting")}>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      icon={ServerOff}
      tone="warning"
      title={t("system.siteDown.unavailable.title")}
      description={t("system.siteDown.unavailable.description")}
      footer={t("system.siteDown.unavailable.footer")}
    >
      <div className="space-y-4">
        <p className="text-center text-sm text-muted-foreground" aria-live="polite">
          <Trans
            t={t}
            i18nKey="system.siteDown.unavailable.retryIn"
            count={countdown}
            components={{ strong: <span className="font-medium text-foreground tabular-nums" /> }}
          />
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/">{t("common.backToSignIn")}</Link>
          </Button>
          <Button className="w-full" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {t("system.siteDown.unavailable.retryNow")}
          </Button>
        </div>
      </div>
    </AuthCard>
  )
}
