"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { Receipt, Search, SearchX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { GET_USER_DATA } from "@/graphql/account"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { formatDate, formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  PAYMENT_STATUS_FILTERS,
  TRANSACTION_TYPES,
  paymentMethodLabel,
  paymentStatus,
  transactionType,
  type TransactionType,
} from "./payment-labels"

interface Transaction {
  id: string
  invoice_date: string
  amount: number
  payment_status: string
  payment_method: string
  type: TransactionType
}

const ITEMS_PER_PAGE = 10
const ALL = "all"
const COLUMN_COUNT = 5

// "+50,00 €" for money coming in, "−50,00 €" for money leaving the account.
function signedAmount(transaction: Transaction) {
  const amount = formatMoney(transaction.amount)
  if (transaction.type === "topup") return `+${amount}`
  if (transaction.type === "spend") return `−${amount}`
  return amount
}

export default function TransactionHistory() {
  const { t } = useTranslation("profile")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState(ALL)
  const [filterType, setFilterType] = useState(ALL)

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

  const transactions: Transaction[] = (data?.paymentsByUser ?? [])
    .filter((payment: { invoice: any }) => payment.invoice)
    .map((payment: { id: string; invoice: any; payment_method: string }) => ({
      id: payment.id,
      invoice_date: payment.invoice.invoice_date,
      amount: Number(payment.invoice.amount),
      payment_status: payment.invoice.payment_status,
      payment_method: payment.payment_method,
      type: transactionType(payment.payment_method),
    }))
    // Most recent first.
    .sort(
      (a: Transaction, b: Transaction) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime(),
    )

  const search = searchTerm.trim().toLowerCase()
  const filteredTransactions = transactions.filter((transaction) => {
    // The search runs on what the row shows, not on the codes behind it.
    const matchesSearch =
      !search ||
      [
        formatDate(transaction.invoice_date),
        TRANSACTION_TYPES[transaction.type].label,
        paymentMethodLabel(transaction.payment_method),
        paymentStatus(transaction.payment_status).label,
        formatMoney(transaction.amount),
        String(transaction.amount),
      ].some((value) => value.toLowerCase().includes(search))

    const matchesStatus = filterStatus === ALL || paymentStatus(transaction.payment_status).key === filterStatus
    const matchesType = filterType === ALL || transaction.type === filterType

    return matchesSearch && matchesStatus && matchesType
  })

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE))
  const page = Math.min(currentPage, totalPages)
  const firstIndex = (page - 1) * ITEMS_PER_PAGE
  const paginatedTransactions = filteredTransactions.slice(firstIndex, firstIndex + ITEMS_PER_PAGE)

  const hasFilters = Boolean(search) || filterStatus !== ALL || filterType !== ALL

  const clearFilters = () => {
    setFilterStatus(ALL)
    setFilterType(ALL)
    setSearchTerm("")
    setCurrentPage(1)
  }

  const isLoading = loading || (!data && !error)

  return (
    <section className="space-y-4" aria-labelledby="transactions-title">
      <h2 id="transactions-title" className="text-lg font-semibold">
        {t("history.title")}
      </h2>

      {error ? (
        <ErrorState
          description={t("history.loadError")}
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label={t("history.searchLabel")}
                placeholder={t("history.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={filterType}
              onValueChange={(value) => {
                setFilterType(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label={t("history.filterByType")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("history.allTypes")}</SelectItem>
                {(Object.keys(TRANSACTION_TYPES) as TransactionType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {TRANSACTION_TYPES[type].plural}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterStatus}
              onValueChange={(value) => {
                setFilterStatus(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-44" aria-label={t("history.filterByStatus")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("history.allStatuses")}</SelectItem>
                {PAYMENT_STATUS_FILTERS.map((status) => (
                  <SelectItem key={status.key} value={status.key}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} className="sm:ml-auto">
                {t("common:actions.reset")}
              </Button>
            )}
          </div>

          <div className="rounded-md border">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common:labels.date")}</TableHead>
                  <TableHead>{t("common:labels.type")}</TableHead>
                  <TableHead>{t("history.columns.paymentMethod")}</TableHead>
                  <TableHead>{t("common:labels.status")}</TableHead>
                  <TableHead className="text-right">{t("history.columns.amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, row) => (
                    <TableRow key={row}>
                      {Array.from({ length: COLUMN_COUNT }).map((_, cell) => (
                        <TableCell key={cell}>
                          <Skeleton className={cn("h-5 w-24", cell === COLUMN_COUNT - 1 && "ml-auto w-20")} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((transaction) => {
                    const status = paymentStatus(transaction.payment_status)
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap">{formatDate(transaction.invoice_date)}</TableCell>
                        <TableCell>{TRANSACTION_TYPES[transaction.type].label}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {paymentMethodLabel(transaction.payment_method)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap text-right font-medium tabular-nums",
                            transaction.type === "topup" && "text-success",
                          )}
                        >
                          {signedAmount(transaction)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COLUMN_COUNT} className="p-4">
                      {hasFilters ? (
                        <EmptyState
                          icon={SearchX}
                          title={t("history.noMatchTitle")}
                          description={t("history.noMatchDescription")}
                          action={
                            <Button variant="outline" onClick={clearFilters}>
                              {t("history.resetFilters")}
                            </Button>
                          }
                          className="border-0"
                        />
                      ) : (
                        <EmptyState
                          icon={Receipt}
                          title={t("history.emptyTitle")}
                          description={t("history.emptyDescription")}
                          className="border-0"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoading && filteredTransactions.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground tabular-nums">
                {t("history.range", {
                  from: firstIndex + 1,
                  to: firstIndex + paginatedTransactions.length,
                  count: filteredTransactions.length,
                })}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(page - 1, 1))}
                    disabled={page === 1}
                  >
                    {t("common:pagination.previous")}
                  </Button>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {t("common:pagination.pageOf", { page, total: totalPages })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(page + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    {t("common:pagination.next")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
