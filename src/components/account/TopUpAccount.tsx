"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useMutation } from "@apollo/client"
import dynamic from "next/dynamic"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { PayPalScriptProvider } from "@paypal/react-paypal-js"
import type { PayPalButtonsComponentProps } from "@paypal/react-paypal-js"
import { PROCESS_PAYMENT, UPDATE_PAYMENT_STATUS } from "@/graphql/account"
import { useToast } from "@/components/hooks/use-toast"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { CreditCard, Wallet, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"

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
  const [updatePaymentStatus] = useMutation(UPDATE_PAYMENT_STATUS)

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
      await updatePaymentStatus({
        variables: {
          paymentId: data.orderID,
          status: "completed",
        },
      })

      toast({
        title: "Succès",
        description: "Paiement PayPal confirmé et solde mis à jour !",
      })
      setAmount("")
    } catch (error) {
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
      <div className="p-4 border rounded-lg bg-muted/30">
        <p className="text-sm text-muted-foreground mb-2">
          Vous allez recharger votre compte de <strong>€{Number.parseFloat(amount).toFixed(2)}</strong> via PayPal.
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
        <div className="text-center text-sm text-muted-foreground">Traitement en cours, veuillez patienter...</div>
      )}
    </div>
  )
}

function CheckoutForm({
  clientSecret,
  amount,
  setAmount,
  userId,
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

  const [updatePaymentStatus] = useMutation(UPDATE_PAYMENT_STATUS)

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
        await updatePaymentStatus({
          variables: {
            paymentId: paymentIntent.id,
            status: "completed",
          },
        })

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
    <div className="mt-4 space-y-4">
      <div className="p-4 border rounded-lg bg-muted/30">
        <p className="text-sm text-muted-foreground mb-4">
          Vous allez recharger votre compte de <strong>€{Number.parseFloat(amount).toFixed(2)}</strong> via carte
          bancaire.
        </p>
        <PaymentElement />
      </div>

      <Button className="w-full" disabled={loading} onClick={handleConfirmStripePayment}>
        {loading ? "Traitement en cours..." : "Payer avec Stripe"}
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <ClientPayPalProvider>
        <Card className="h-full shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-semibold flex items-center">
              <Wallet className="mr-2 h-5 w-5 text-primary" />
              Recharger mon compte
            </CardTitle>
            <CardDescription>Ajoutez des fonds à votre compte via carte bancaire ou PayPal</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount" className="text-sm font-medium">
                  Montant à recharger (€)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Ex: 10"
                  value={amount}
                  onChange={handleAmountChange}
                  className="mt-1"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {predefinedAmounts.map((amt) => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAmount(amt.toString())
                      if (clientSecret) setClientSecret(null)
                    }}
                    className="flex-1"
                  >
                    €{amt}
                  </Button>
                ))}
              </div>

              {error && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="stripe" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="stripe" className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Carte Bancaire
                  </TabsTrigger>
                  <TabsTrigger value="paypal">
                    <svg
                      className="h-4 w-4 mr-2 inline-block"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M19.5 8.5H4.5C3.4 8.5 2.5 9.4 2.5 10.5V17.5C2.5 18.6 3.4 19.5 4.5 19.5H19.5C20.6 19.5 21.5 18.6 21.5 17.5V10.5C21.5 9.4 20.6 8.5 19.5 8.5Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7 15.5H7.01"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M3.5 11.5L21.5 11.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    PayPal
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="stripe" className="mt-4 space-y-4">
                  {!clientSecret ? (
                    <div className="mt-4">
                      <Button
                        className="w-full"
                        onClick={handleInitStripeIntent}
                        disabled={loadingStripeIntent || !amount || Number.parseFloat(amount) <= 0}
                      >
                        {loadingStripeIntent ? "Initialisation..." : "Initialiser le paiement par carte"}
                      </Button>
                    </div>
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
                  {Number.parseFloat(amount) > 0 ? (
                    <PayPalButtonsWrapper
                      amount={amount}
                      userId={userId ? Number.parseInt(userId) : 0}
                      setAmount={setAmount}
                    />
                  ) : (
                    <div className="p-4 border rounded-lg bg-muted/30 text-center">
                      <p className="text-sm text-muted-foreground">
                        Veuillez saisir un montant pour continuer avec PayPal
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </ClientPayPalProvider>
    </motion.div>
  )
}
