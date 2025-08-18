"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@apollo/client"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, PlusCircle, MinusCircle, Search, FileText, Filter } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { GET_USER_DATA } from "@/graphql/account"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { motion } from "framer-motion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { useTranslations } from "next-intl"

interface Transaction {
  id: string
  invoice_date: string
  amount: number
  payment_status: string
  payment_method: string
  transaction_type: "Ajout" | "Retrait"
}

function getStatusBadge(t: any, payment_status: string) {
  switch (payment_status) {
    case "completed":
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
          {t('payed')}
        </Badge>
      )
    case "pending":
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
          {t('waiting')}
        </Badge>
      )
    case "overdue":
      return <Badge variant="destructive">{t('retarded')}</Badge>
    default:
      return <Badge variant="outline">{payment_status}</Badge>
  }
}

function getTransactionIcon(payment_method: string) {
  return ["stripe", "paypal"].includes(payment_method.toLowerCase()) ? (
    <PlusCircle className="inline-block mr-2 text-green-500" size={16} />
  ) : (
    <MinusCircle className="inline-block mr-2 text-red-500" size={16} />
  )
}

function getPaymentMethodLabel(method: string) {
  const t = useTranslations("profile")
  switch (method.toLowerCase()) {
    case "stripe":
      return t('card')
    case "paypal":
      return t('paypal')
    case "account_balance":
      return t('userAccount')
    default:
      return method
  }
}

export default function TransactionHistory() {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string | null>(null)
  const itemsPerPage = 10

  const t = useTranslations("profile")

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
      <Card className="w-full shadow-md">
        <CardHeader>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('error')}</AlertTitle>
        <AlertDescription>{error.message || t('errorHistoryFetch')}</AlertDescription>
      </Alert>
    )
  }

  const transactions: Transaction[] =
    data?.paymentsByUser
      ?.map((payment: { invoice: any; payment_method: string }) => {
        if (!payment.invoice) return null
        const transaction_type = ["stripe", "paypal"].includes(payment.payment_method.toLowerCase())
          ? t('add')
          : t('withdraw')
        return {
          id: payment.invoice.id,
          invoice_date: payment.invoice.invoice_date,
          amount: payment.invoice.amount,
          payment_status: payment.invoice.payment_status,
          payment_method: payment.payment_method,
          transaction_type,
        }
      })
      .filter(Boolean) || []

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.amount.toString().includes(searchTerm) ||
      transaction.payment_status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.payment_method.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPaymentMethodLabel(transaction.payment_method).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (["stripe", "paypal"].includes(transaction.payment_method.toLowerCase()) ? t('add') : t('withdraw')).includes(
        searchTerm.toLowerCase(),
      )

    const matchesStatus = filterStatus ? transaction.payment_status === filterStatus : true

    const matchesType = filterType
      ? filterType === "ajout"
        ? ["stripe", "paypal"].includes(transaction.payment_method.toLowerCase())
        : transaction.payment_method.toLowerCase() === "account_balance"
      : true

    return matchesSearch && matchesStatus && matchesType
  })

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const clearFilters = () => {
    setFilterStatus(null)
    setFilterType(null)
    setSearchTerm("")
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="w-full shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-semibold flex items-center">
            <FileText className="mr-2 h-5 w-5 text-primary" />
            {t('history')}
          </CardTitle>
          <CardDescription>{t('historyDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="relative w-full sm:w-auto flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    {t('filter')}
                    {(filterStatus || filterType) && (
                      <Badge variant="secondary" className="ml-2 bg-primary/20">
                        {filterStatus || filterType ? "1+" : ""}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{t('filterByStatus')}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setFilterStatus("completed")}>{t('payed')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("pending")}>{t('waiting')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("overdue")}>{t('retarded')}</DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuLabel>{t('filterByType')}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setFilterType("ajout")}>{t('adds')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("retrait")}>{t('withdraw')}</DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={clearFilters}>{t('deleteFilter')}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {(filterStatus || filterType) && (
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm text-muted-foreground">{t('activeFilters')}:</p>
              {filterStatus && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {filterStatus}
                  <button onClick={() => setFilterStatus(null)} className="ml-1 h-4 w-4 rounded-full hover:bg-muted">
                    ×
                  </button>
                </Badge>
              )}
              {filterType && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {filterType === "ajout" ? t('adds') : t('withdraw')}
                  <button onClick={() => setFilterType(null)} className="ml-1 h-4 w-4 rounded-full hover:bg-muted">
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('amount')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('methodOfPayment')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {format(new Date(transaction.invoice_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {getTransactionIcon(transaction.payment_method)}
                        <span
                          className={
                            transaction.payment_method.toLowerCase() === "account_balance"
                              ? "text-red-500 font-medium"
                              : "text-green-500 font-medium"
                          }
                        >
                          €{transaction.amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(t, transaction.payment_status)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      {searchTerm || filterStatus || filterType ? (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Search className="h-8 w-8 mb-2 opacity-50" />
                          <p>{t('noTransactionFound')}</p>
                          <Button variant="link" onClick={clearFilters} className="mt-2">
                            {t('deleteFilter')}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <FileText className="h-8 w-8 mb-2 opacity-50" />
                          <p>{t('noTransactionFound')}</p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {paginatedTransactions.length > 0 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                {t('page', {from: paginatedTransactions.length, to: filteredTransactions.length})}
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  {t('previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  {t('next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
