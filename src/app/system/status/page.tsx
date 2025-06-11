"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ServerOff, AlertTriangle, RefreshCw, Home, Clock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import Link from "next/link"

type PageState = "loading" | "error" | "unavailable" | "available"

export default function SiteDownPage() {
  const [pageState, setPageState] = useState<PageState>("loading")
  const [countdown, setCountdown] = useState(30)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>("")

  // Vérifier l'état du service
  useEffect(() => {
    const checkServiceStatus = async () => {
      try {
        // Vérification réelle du backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}`, {
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

        // Si la requête échoue complètement (erreur réseau)
        if (!response.ok) {
          throw new Error(`Erreur réseau: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()

        // Vérifier si la requête GraphQL a retourné des erreurs
        if (result.errors) {
          throw new Error(result.errors[0]?.message || "Erreur GraphQL inconnue")
        }

        // Vérifier le statut retourné par l'API
        if (result.data?.getSiteStatus === "available") {
          setPageState("available")
          setStatusMessage("Le service est disponible. Redirection vers la page d'accueil...")

          // Rediriger vers la page d'accueil après un court délai
          setTimeout(() => {
            window.location.href = "/"
          }, 2000)
        } else {
          setPageState("unavailable")
          setStatusMessage(result.data?.getSiteStatus || "Le backend est indisponible")
        }
      } catch (err) {
        console.error("Erreur lors de la vérification du statut:", err)
        setError(err instanceof Error ? err : new Error("Une erreur inconnue s'est produite"))
        setPageState("error")
      }
    }

    checkServiceStatus()
  }, [])

  // Compte à rebours pour le rafraîchissement automatique
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

  const handleRetry = () => {
    setPageState("loading")
    setError(null)
    window.location.reload()
  }

  // Rendu conditionnel basé sur l'état de la page
  if (pageState === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Vérification de l'état du service...</p>
        </div>
      </div>
    )
  }

  if (pageState === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4 dark:from-slate-950 dark:to-slate-900">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/30">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-600 dark:text-red-400" />
          <h2 className="mb-2 text-xl font-bold text-red-800 dark:text-red-300">Erreur de connexion</h2>
          <p className="mb-4 text-sm text-red-700 dark:text-red-300">
            Une erreur est présente actuellement sur nos serveurs, veuillez réessayer ultérieurement.
            {error && <span className="block mt-2 text-xs">{error.message}</span>}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={handleRetry}>
              Réessayer
            </Button>
            <Button asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Retour à l'accueil
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (pageState === "available") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4 dark:from-slate-950 dark:to-slate-900">
        <div className="w-full max-w-md rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-950/30">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600 dark:text-green-400" />
          <h2 className="mb-2 text-xl font-bold text-green-800 dark:text-green-300">Service disponible</h2>
          <p className="mb-4 text-sm text-green-700 dark:text-green-300">{statusMessage}</p>
          <div className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>
    )
  }

  // État par défaut : service indisponible
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4 dark:from-slate-950 dark:to-slate-900">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-t-4 border-t-amber-500 shadow-lg dark:shadow-amber-900/10">
          <CardHeader className="pb-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <ServerOff className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-2xl">Service indisponible</CardTitle>
            <CardDescription className="text-base">
              Nos serveurs rencontrent actuellement des ralentissements, veuillez réessayer ultérieurement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-6 text-center">
            <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm font-medium">
                  Nos équipes techniques ont été notifiées et travaillent à résoudre le problème.
                </p>
              </div>
            </div>

            {statusMessage && (
              <div className="text-sm font-medium">
                <p>
                  Message du serveur: <span className="text-amber-600 dark:text-amber-400">{statusMessage}</span>
                </p>
              </div>
            )}

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Cette interruption peut être due à une maintenance planifiée ou à un problème technique inattendu.</p>
              <p>
                Nous vous recommandons de réessayer dans quelques instants ou de contacter le support si le problème
                persiste.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                Rafraîchissement automatique dans <span className="text-primary">{countdown} secondes</span>
              </span>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" className="w-full gap-2" asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
                Retour à l'accueil
              </Link>
            </Button>
            <Button className="w-full gap-2" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Rafraîchissement..." : "Rafraîchir maintenant"}
            </Button>
          </CardFooter>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-6 text-center text-sm text-muted-foreground"
        >
          <p>
            Si vous avez besoin d'assistance immédiate, veuillez contacter notre équipe support à{" "}
            <a href="mailto:support@example.com" className="text-primary hover:underline">
              support@example.com
            </a>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
