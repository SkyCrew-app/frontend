"use client";

import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { ReactNode } from "react";

export function ClientPayPalProvider({ children }: { children: ReactNode }) {
  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        currency: "EUR",
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}
