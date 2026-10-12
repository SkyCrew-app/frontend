"use client"

import AccountOverview from "@/components/account/AccountOverview"
import TransactionHistory from "@/components/account/TransactionHistory"
import TopUpAccount from "@/components/account/TopUpAccount"
import { PageHeader } from "@/components/layout/PageHeader"

export default function MoneyAccountPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mon compte"
        description="Votre solde, le rechargement de votre compte et l'historique de vos transactions."
        className="mb-0"
      />

      <AccountOverview />

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <TopUpAccount />
        <div className="min-w-0 xl:col-span-2">
          <TransactionHistory />
        </div>
      </div>
    </div>
  )
}
