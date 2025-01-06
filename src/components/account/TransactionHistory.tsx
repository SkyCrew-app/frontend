'use client'

import React, { useState } from 'react'
import { useQuery } from '@apollo/client'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, PlusCircle, MinusCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { GET_USER_DATA } from '@/graphql/account'

interface Transaction {
  id: string
  invoice_date: string
  amount: number
  payment_status: string
  payment_method: string
  transaction_type: 'Ajout' | 'Retrait'
}

function getStatusBadge(payment_status: string) {
  switch (payment_status) {
    case 'completed':
      return <Badge variant="default">Payé</Badge>
    case 'pending':
      return <Badge variant="secondary">En attente</Badge>
    case 'overdue':
      return <Badge variant="destructive">En retard</Badge>
    default:
      return <Badge variant="outline">{payment_status}</Badge>
  }
}

function getTransactionIcon(payment_method: string) {
  return ['stripe', 'paypal'].includes(payment_method.toLowerCase())
    ? <PlusCircle className="inline-block mr-2 text-green-500" size={16} />
    : <MinusCircle className="inline-block mr-2 text-red-500" size={16} />
}

export default function TransactionHistory() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const { data, loading, error } = useQuery(GET_USER_DATA, {
    variables: { userId: 2 },
    fetchPolicy: 'network-only',
  })

  if (loading) return <Skeleton className="h-[400px] w-full" />

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          {error.message || "Impossible de charger l'historique des transactions."}
        </AlertDescription>
      </Alert>
    )
  }

  const transactions: Transaction[] = data?.paymentsByUser?.map((payment: { invoice: any, payment_method: string }) => {
    if (!payment.invoice) return null
    const transaction_type = ['stripe', 'paypal'].includes(payment.payment_method.toLowerCase()) ? 'Ajout' : 'Retrait'
    return {
      id: payment.invoice.id,
      invoice_date: payment.invoice.invoice_date,
      amount: payment.invoice.amount,
      payment_status: payment.invoice.payment_status,
      payment_method: payment.payment_method,
      transaction_type,
    }
  }).filter(Boolean) || []

  const filteredTransactions = transactions.filter(transaction =>
    transaction.amount.toString().includes(searchTerm) ||
    transaction.payment_status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.payment_method.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ((['stripe', 'paypal'].includes(transaction.payment_method.toLowerCase()) ? 'ajout' : 'retrait').includes(searchTerm.toLowerCase()))
  )

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Historique des Transactions</CardTitle>
        <CardDescription>Liste de toutes vos transactions récentes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Rechercher par montant, statut, méthode de paiement..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Méthode de paiement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{format(new Date(transaction.invoice_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      {getTransactionIcon(transaction.payment_method)}
                      <span className={transaction.payment_method.toLowerCase() === 'account_balance' ? 'text-red-500' : 'text-green-500'}>
                        €{transaction.amount.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(transaction.payment_status)}</TableCell>
                    <TableCell>
                      {transaction.payment_method === 'account_balance' ? 'Compte utilisateur' : transaction.payment_method}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Aucun résultat.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Affichage de {paginatedTransactions.length} sur {filteredTransactions.length} transactions
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
