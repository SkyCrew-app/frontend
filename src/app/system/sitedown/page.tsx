"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, RefreshCw, ServerOff, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getGraphqlUrl, withBasePath } from "@/lib/runtime-config"
import { AuthCard, AuthCardSkeleton } from "@/app/auth/_components/AuthCard"

type PageState = "loading" | "error" | "unavailable" | "available"

export default function SiteDownPage() {
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
        title="Connexion au serveur impossible"
        description="L'état du service n'a pas pu être vérifié. Vérifiez votre connexion Internet puis réessayez."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/">Retour à la connexion</Link>
          </Button>
          <Button className="w-full" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Réessayer
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
        title="Le service est de nouveau disponible"
        description="Vous allez être redirigé vers la page de connexion."
      >
        <div className="flex justify-center" role="status" aria-label="Redirection en cours">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      icon={ServerOff}
      tone="warning"
      title="Service indisponible"
      description="SkyCrew est momentanément inaccessible : maintenance ou incident technique."
      footer="Si le problème persiste, contactez un administrateur du club."
    >
      <div className="space-y-4">
        <p className="text-center text-sm text-muted-foreground" aria-live="polite">
          Nouvelle tentative automatique dans{" "}
          <span className="font-medium text-foreground tabular-nums">
            {countdown} seconde{countdown > 1 ? "s" : ""}
          </span>
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/">Retour à la connexion</Link>
          </Button>
          <Button className="w-full" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Réessayer maintenant
          </Button>
        </div>
      </div>
    </AuthCard>
  )
}
