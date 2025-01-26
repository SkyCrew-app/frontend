"use client";

import React, { useEffect, useState } from "react";
import { useMutation } from "@apollo/client";
import dynamic from "next/dynamic";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { PayPalButtonsComponentProps } from "@paypal/react-paypal-js";

import { PROCESS_PAYMENT, UPDATE_PAYMENT_STATUS } from "@/graphql/account";

import { useToast } from "@/components/hooks/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useDecodedToken, useUserData } from "../hooks/userHooks";

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
  );
}

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

const PayPalButtons = dynamic(
  async () => (await import("@paypal/react-paypal-js")).PayPalButtons,
  { ssr: false }
);

interface PayPalButtonsWrapperProps {
  amount: string;
  userId: number;
  setAmount: (val: string) => void;
}

function PayPalButtonsWrapper({ amount, userId, setAmount }: PayPalButtonsWrapperProps) {
  const { toast } = useToast();

  const [processPayment] = useMutation(PROCESS_PAYMENT);
  const [updatePaymentStatus] = useMutation(UPDATE_PAYMENT_STATUS);

  const createOrder: PayPalButtonsComponentProps["createOrder"] = async () => {
    try {
      const { data } = await processPayment({
        variables: {
          createPaymentInput: {
            amount: parseFloat(amount),
            payment_method: "paypal",
            user_id: userId,
          },
        },
      });

      const externalId = data?.processPayment?.external_payment_id;
      if (!externalId) {
        throw new Error("Impossible de récupérer external_payment_id PayPal");
      }
      return externalId;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur PayPal",
        description: "Impossible de créer la commande PayPal",
      });
      throw error;
    }
  };

  const onApprove: PayPalButtonsComponentProps["onApprove"] = async (data: { orderID: any; }) => {
    try {
      await updatePaymentStatus({
        variables: {
          paymentId: data.orderID,
          status: "completed",
        },
      });

      toast({
        title: "Succès",
        description: "Paiement PayPal confirmé et solde mis à jour !",
      });
      setAmount("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur PayPal",
        description: "Le paiement n'a pas pu être capturé.",
      });
    }
  };

  return (
    <PayPalButtons
      createOrder={createOrder}
      onApprove={onApprove}
      style={{ layout: "vertical" }}
    />
  );
}

function CheckoutForm({
  clientSecret,
  amount,
  setAmount,
  userId,
}: {
  clientSecret: string;
  amount: string;
  setAmount: (val: string) => void;
  userId: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const [updatePaymentStatus] = useMutation(UPDATE_PAYMENT_STATUS);

  const handleConfirmStripePayment = async () => {
    if (!stripe || !elements) return;
    try {
      setLoading(true);
      setError(null);

      const { paymentIntent, error: stripeError } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent?.status === "succeeded") {
        await updatePaymentStatus({
          variables: {
            paymentId: paymentIntent.id,
            status: "completed",
          },
        });

        toast({
          title: "Succès",
          description: "Paiement Stripe confirmé et solde mis à jour !",
        });
        setAmount("");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur Stripe inconnue";
      setError(msg);
      toast({
        variant: "destructive",
        title: "Erreur Stripe",
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="p-4 border rounded-md">
        <PaymentElement />
      </div>

      <Button
        className="w-full"
        disabled={loading}
        onClick={handleConfirmStripePayment}
      >
        {loading ? "Traitement..." : "Payer avec Stripe"}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default function TopUpAccount() {
  const [amount, setAmount] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [loadingStripeIntent, setLoadingStripeIntent] = useState(false);

  const { toast } = useToast();
  const [processPayment] = useMutation(PROCESS_PAYMENT);

  const userEmail = useDecodedToken();
  const userData = useUserData(userEmail);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (userData) {
      setUserId(userData.id);
    }
  }, [userData]);

  const handleInitStripeIntent = async () => {
    try {
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error("Veuillez saisir un montant > 0");
      }
      setLoadingStripeIntent(true);
      setError(null);

      const { data } = await processPayment({
        variables: {
          createPaymentInput: {
            amount: parseFloat(amount),
            payment_method: "stripe",
            user_id: userId,
          },
        },
      });

      const secret = data?.processPayment?.client_secret;
      if (!secret) {
        throw new Error("Impossible de récupérer le client_secret Stripe");
      }

      setClientSecret(secret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setError(msg);
      toast({
        variant: "destructive",
        title: "Erreur Stripe",
        description: msg,
      });
    } finally {
      setLoadingStripeIntent(false);
    }
  };

  return (
    <ClientPayPalProvider>
      <Card>
        <CardHeader>
          <CardTitle>Recharger mon compte</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-2">
            <Label>Saisir le montant (€)</Label>
            <Input
              type="number"
              placeholder="Ex: 10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="stripe" className="mt-6 space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stripe">Carte Bancaire (Stripe)</TabsTrigger>
              <TabsTrigger value="paypal">PayPal</TabsTrigger>
            </TabsList>

            <TabsContent value="stripe">
              {!clientSecret ? (
                <div className="mt-4">
                  <Button
                    className="w-full"
                    onClick={handleInitStripeIntent}
                    disabled={loadingStripeIntent || parseFloat(amount) <= 0}
                  >
                    {loadingStripeIntent
                      ? "Initialisation..."
                      : "Initialiser le paiement Stripe"}
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
                    userId={userId ? parseInt(userId) : 0}
                  />
                </Elements>
              )}
            </TabsContent>

            <TabsContent value="paypal">
              <div className="mt-4">
                <PayPalButtonsWrapper
                  amount={amount}
                  userId={userId ? parseInt(userId) : 0}
                  setAmount={setAmount}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </ClientPayPalProvider>
  );
}
