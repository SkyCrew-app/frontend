"use client"

import { useTranslation } from "react-i18next"
import AccountOverview from "@/components/account/AccountOverview"
import TransactionHistory from "@/components/account/TransactionHistory"
import TopUpAccount from "@/components/account/TopUpAccount"
import { PageHeader } from "@/components/layout/PageHeader"

export default function MoneyAccountPage() {
  const { t } = useTranslation("profile")

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("account.title")}
        description={t("account.description")}
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
