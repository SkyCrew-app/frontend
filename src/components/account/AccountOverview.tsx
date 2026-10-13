"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/layout/StatCard"
import { ErrorState } from "@/components/layout/ErrorState"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { GET_USER_DATA } from "@/graphql/account"
import { GET_USER_PROFILE } from "@/graphql/user"
import { formatMoney } from "@/lib/format"
import { isBalanceSpend, isTopUp, paymentStatus } from "./payment-labels"

export default function AccountOverview() {
  const { t } = useTranslation("profile")
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const { data, loading, error, refetch } = useQuery(GET_USER_DATA, {
    variables: { userId },
    fetchPolicy: "network-only",
    skip: !userId,
  })

  // The balance is read on the member: a member without any payment has one too.
  const { data: profileData } = useQuery(GET_USER_PROFILE, {
    variables: { email: userEmail || "" },
    fetchPolicy: "cache-and-network",
    skip: !userEmail,
  })

  if (error) {
    return (
      <ErrorState
        description={t("account.overview.loadError")}
        onRetry={() => refetch()}
      />
    )
  }

  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Skeleton className="col-span-2 h-[92px] rounded-xl lg:col-span-1" />
        <Skeleton className="h-[92px] rounded-xl" />
        <Skeleton className="h-[92px] rounded-xl" />
      </div>
    )
  }

  const transactions: any[] = data?.paymentsByUser || []

  const userBalance = Number(
    profileData?.userByEmail?.user_account_balance ?? transactions[0]?.user?.user_account_balance ?? 0,
  )

  // Only money actually received counts: abandoned or refused attempts stay out.
  const settled = transactions.filter((t) => paymentStatus(t.payment_status).key === "paid")
  const totalDeposits = settled
    .filter((t) => isTopUp(t.payment_method))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  const totalSpent = settled
    .filter((t) => isBalanceSpend(t.payment_method))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      <StatCard
        className="col-span-2 lg:col-span-1"
        label={t("account.overview.balance")}
        value={formatMoney(userBalance)}
        hint={userBalance < 0 ? t("account.overview.overdrawn") : undefined}
        icon={Wallet}
        tone={userBalance < 0 ? "danger" : "primary"}
      />
      <StatCard label={t("account.overview.totalToppedUp")} value={formatMoney(totalDeposits)} icon={ArrowDownLeft} tone="success" />
      <StatCard label={t("account.overview.totalSpent")} value={formatMoney(totalSpent)} icon={ArrowUpRight} tone="neutral" />
    </div>
  )
}
