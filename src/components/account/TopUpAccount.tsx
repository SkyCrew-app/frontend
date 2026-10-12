"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useMutation } from "@apollo/client"
import dynamic from "next/dynamic"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { PayPalScriptProvider } from "@paypal/react-paypal-js"
import type { PayPalButtonsComponentProps } from "@paypal/react-paypal-js"
import { PROCESS_PAYMENT, CONFIRM_PAYMENT } from "@/graphql/account"
import { useToast } from "@/components/hooks/use-toast"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Loader2 } from "lucide-react"
import { formatMoney } from "@/lib/format"

export function ClientPayPalProvider({ children }: { children: React.ReactNode }) {
  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
        currency: "EUR",
      }}
    >
      {children}
    </PayPalScriptProvider>
  )
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

const PayPalButtons = dynamic(async () => (await import("@paypal/react-paypal-js")).PayPalButtons, { ssr: false })

interface PayPalButtonsWrapperProps {
  amount: string
  userId: number
  setAmount: (val: string) => void
}

function PayPalButtonsWrapper({ amount, userId, setAmount }: PayPalButtonsWrapperProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  const [processPayment] = useMutation(PROCESS_PAYMENT)
  // The balance shown elsewhere is read again once the account is credited.
  const [confirmPayment] = useMutation(CONFIRM_PAYMENT, { refetchQueries: "active" })

  const createOrder: PayPalButtonsComponentProps["createOrder"] = async () => {
    try {
      setIsProcessing(true)
      const { data } = await processPayment({
        variables: {
          createPaymentInput: {
            amount: Number.parseFloat(amount),
            payment_method: "paypal",
            user_id: userId,
          },
        },
      })

      const externalId = data?.processPayment?.external_payment_id
      if (!externalId) {
        throw new Error("Impossible de récupérer external_payment_id PayPal")
      }
      return externalId
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur PayPal",
        description: "Impossible de créer la commande PayPal",
      })
      throw error
    } finally {
      setIsProcessing(false)
    }
  }

  const onApprove: PayPalButtonsComponentProps["onApprove"] = async (data: { orderID: any }) => {
    try {
      setIsProcessing(true)
      await confirmPayment({ variables: { paymentId: data.orderID } })

      toast({
        title: "Succès",
        description: "Paiement PayPal confirmé et solde mis à jour !",
      })
      setAmount("")
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur PayPal",
        description: "Le paiement n'a pas pu être capturé.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          Vous allez recharger votre compte de{" "}
          <strong className="font-semibold text-foreground tabular-nums">
            {formatMoney(Number.parseFloat(amount))}
          </strong>{" "}
          avec PayPal.
        </p>
        <PayPalButtons
          createOrder={createOrder}
          onApprove={onApprove}
          style={{ layout: "vertical", color: "blue" }}
          disabled={isProcessing || Number.parseFloat(amount) <= 0}
          forceReRender={[amount]}
        />
      </div>
      {isProcessing && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Paiement en cours de traitement, ne fermez pas cette page.
        </p>
      )}
    </div>
  )
}

function CheckoutForm({
  amount,
  setAmount,
}: {
  clientSecret: string
  amount: string
  setAmount: (val: string) => void
  userId: number
}) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const stripe = useStripe()
  const elements = useElements()
  const { toast } = useToast()

  // The balance shown elsewhere is read again once the account is credited.
  const [confirmPayment] = useMutation(CONFIRM_PAYMENT, { refetchQueries: "active" })

  const handleConfirmStripePayment = async () => {
    if (!stripe || !elements) return
    try {
      setLoading(true)
      setError(null)

      const { paymentIntent, error: stripeError } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      })

      if (stripeError) {
        throw new Error(stripeError.message)
      }

      if (paymentIntent?.status === "succeeded") {
        await confirmPayment({ variables: { paymentId: paymentIntent.id } })

        toast({
          title: "Succès",
          description: "Paiement Stripe confirmé et solde mis à jour !",
        })
        setAmount("")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur Stripe inconnue"
      setError(msg)
      toast({
        variant: "destructive",
        title: "Erreur Stripe",
        description: msg,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          Vous allez recharger votre compte de{" "}
          <strong className="font-semibold text-foreground tabular-nums">
            {formatMoney(Number.parseFloat(amount))}
          </strong>{" "}
          par carte bancaire.
        </p>
        <PaymentElement />
      </div>

      <Button className="w-full" disabled={loading} onClick={handleConfirmStripePayment}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {loading
          ? "Paiement en cours..."
          : Number.parseFloat(amount) > 0
            ? `Payer ${formatMoney(Number.parseFloat(amount))}`
            : "Payer"}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default function TopUpAccount() {
  const [amount, setAmount] = useState("")
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingStripeIntent, setLoadingStripeIntent] = useState(false)

  const { toast } = useToast()
  const [processPayment] = useMutation(PROCESS_PAYMENT)

  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const handleInitStripeIntent = async () => {
    if (!userId) return
    try {
      if (!amount || Number.parseFloat(amount) <= 0) {
        throw new Error("Veuillez saisir un montant supérieur à 0")
      }
      setLoadingStripeIntent(true)
      setError(null)

      const { data } = await processPayment({
        variables: {
          createPaymentInput: {
            amount: Number.parseFloat(amount),
            payment_method: "stripe",
            user_id: userId,
          },
        },
      })

      const secret = data?.processPayment?.client_secret
      if (!secret) {
        throw new Error("Impossible de récupérer le client_secret Stripe")
      }

      setClientSecret(secret)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue"
      setError(msg)
      toast({
        variant: "destructive",
        title: "Erreur Stripe",
        description: msg,
      })
    } finally {
      setLoadingStripeIntent(false)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (clientSecret) {
      setClientSecret(null)
    }
    setAmount(e.target.value)
  }

  const predefinedAmounts = [10, 20, 50, 100]

  return (
    <ClientPayPalProvider>
      <Card>
        <CardHeader>
          <CardTitle>Recharger mon compte</CardTitle>
          <CardDescription>Choisissez un montant, puis payez par carte bancaire ou avec PayPal.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Montant à recharger (€)</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              placeholder="50"
              value={amount}
              onChange={handleAmountChange}
              className="tabular-nums"
              min="0"
              step="0.01"
            />
          </div>

          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Montants rapides">
            {predefinedAmounts.map((amt) => (
              <Button
                key={amt}
                type="button"
                variant={amount === amt.toString() ? "secondary" : "outline"}
                size="sm"
                onClick={() => {
                  setAmount(amt.toString())
                  if (clientSecret) setClientSecret(null)
                }}
                className="tabular-nums"
              >
                {amt} €
              </Button>
            ))}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="stripe">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stripe">Carte bancaire</TabsTrigger>
              <TabsTrigger value="paypal">PayPal</TabsTrigger>
            </TabsList>

            <TabsContent value="stripe" className="mt-4 space-y-4">
              {!clientSecret ? (
                <Button
                  className="w-full"
                  onClick={handleInitStripeIntent}
                  disabled={loadingStripeIntent || !userId || !amount || Number.parseFloat(amount) <= 0}
                >
                  {loadingStripeIntent && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {loadingStripeIntent ? "Préparation du paiement..." : "Continuer vers le paiement par carte"}
                </Button>
              ) : (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: { theme: "stripe" },
                  }}
                >
                  <CheckoutForm
                    clientSecret={clientSecret}
                    amount={amount}
                    setAmount={setAmount}
                    userId={userId ? Number.parseInt(userId) : 0}
                  />
                </Elements>
              )}
            </TabsContent>

            <TabsContent value="paypal" className="mt-4">
              {!userId ? (
                <Skeleton className="h-24 w-full rounded-lg" />
              ) : Number.parseFloat(amount) > 0 ? (
                <PayPalButtonsWrapper amount={amount} userId={Number(userId)} setAmount={setAmount} />
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Saisissez un montant pour payer avec PayPal.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </ClientPayPalProvider>
  )
}
