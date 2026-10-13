"use client"

import { useMemo } from "react"
import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { Banknote, PiggyBank, Undo2 } from "lucide-react"
import { endOfMonth, endOfYear, startOfMonth, startOfYear } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/layout/StatCard"
import { ErrorState } from "@/components/layout/ErrorState"
import { GET_CASH_RECEIVED } from "@/graphql/finance"
import { formatMoney } from "@/lib/format"
import { StatGrid } from "./finance-shared"

interface CashReceivedProps {
  period: string
  date: Date
}

interface CashReceivedData {
  generateBudgetForecast: { cashReceived: number; cashRefunded: number }
}

/**
 * Money actually received from members over the chosen month or year, read by the API from
 * the lines of their accounts: top-ups are cash received, not revenue.
 */
export default function CashReceived({ period, date }: CashReceivedProps) {
  const { t } = useTranslation("administration")
  const variables = useMemo(
    () =>
      period === "annual"
        ? { startDate: startOfYear(date), endDate: endOfYear(date) }
        : { startDate: startOfMonth(date), endDate: endOfMonth(date) },
    [period, date],
  )
  const { data, loading, error, refetch } = useQuery<CashReceivedData>(GET_CASH_RECEIVED, { variables })

  if (loading && !data) {
    return (
      <StatGrid className="lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[104px] rounded-xl" />
        ))}
      </StatGrid>
    )
  }
  if (error && !data) {
    return <ErrorState description={t("finance.cash.error")} onRetry={() => refetch().catch(() => undefined)} />
  }

  const received = data?.generateBudgetForecast.cashReceived ?? 0
  const refunded = data?.generateBudgetForecast.cashRefunded ?? 0
  const net = Math.round((received - refunded) * 100) / 100

  return (
    <StatGrid className="lg:grid-cols-3">
      <StatCard
        label={t("finance.cash.received")}
        value={formatMoney(received)}
        hint={t("finance.cash.receivedHint")}
        icon={Banknote}
        tone="primary"
      />
      <StatCard
        label={t("finance.cash.refunded")}
        value={formatMoney(refunded)}
        hint={t("finance.cash.refundedHint")}
        icon={Undo2}
        tone="warning"
      />
      <StatCard
        label={t("finance.cash.net")}
        value={formatMoney(net)}
        hint={t("finance.cash.netHint")}
        icon={PiggyBank}
        tone={net >= 0 ? "success" : "danger"}
        className="sm:col-span-2 lg:col-span-1"
      />
    </StatGrid>
  )
}
