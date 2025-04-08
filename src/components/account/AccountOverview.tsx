"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@apollo/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, TrendingUp, Wallet, CreditCard } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { GET_USER_DATA } from "@/graphql/account"
import { motion } from "framer-motion"

export default function AccountOverview() {
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const { data, loading, error } = useQuery(GET_USER_DATA, {
    variables: { userId },
    fetchPolicy: "network-only",
    skip: !userId,
  })

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-32" />
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>{error.message || "Impossible de charger les données du compte."}</AlertDescription>
      </Alert>
    )
  }

  const userBalance = data?.paymentsByUser?.[0]?.user?.user_account_balance || 0

  const transactions = data?.paymentsByUser || []
  const totalDeposits = transactions
    .filter((t: any) => ["stripe", "paypal"].includes(t.payment_method?.toLowerCase()))
    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)

  const totalSpent = transactions
    .filter((t: any) => t.payment_method?.toLowerCase() === "account_balance")
    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="h-full shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-semibold flex items-center">
            <Wallet className="mr-2 h-5 w-5 text-primary" />
            Solde du Compte
          </CardTitle>
          <CardDescription>Votre solde actuel et statistiques financières</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline">
            <p className="text-4xl font-bold text-primary">€{userBalance.toFixed(2)}</p>
            <p className="ml-2 text-sm text-muted-foreground">Solde disponible</p>
          </div>

          <div className="space-y-4 mt-6">
            <div className="bg-muted/50 p-4 rounded-lg border">
              <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                Total Rechargé
              </div>
              <p className="text-2xl font-semibold text-green-600">€{totalDeposits.toFixed(2)}</p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg border">
              <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <CreditCard className="mr-1 h-4 w-4 text-red-500" />
                Total Dépensé
              </div>
              <p className="text-2xl font-semibold text-red-600">€{totalSpent.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
