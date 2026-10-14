"use client"

import { useState } from "react"
import { useLazyQuery, useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { Download, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { toast } from "@/components/hooks/use-toast"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { GET_INVOICE_DOCUMENT, GET_MEMBER_INVOICES } from "@/graphql/account"
import { downloadBase64Pdf } from "@/lib/download"
import { formatDate, formatMoney } from "@/lib/format"
import i18n from "@/lib/i18n"
import { isBalanceSpend, isTopUp } from "./payment-labels"

interface InvoiceRow {
  id: number | string
  invoice_number?: string | null
  invoice_date: string
  amount: number | string
  payment_method?: string | null
  invoice_items?: string | null
}

const SHOWN_AT_FIRST = 10

// What the invoice is for, read from how it was paid.
const subjectKey = (method: string | null | undefined) =>
  isBalanceSpend(method) ? "invoices.subjectBooking" : isTopUp(method) ? "invoices.subjectTopUp" : "invoices.subjectOther"

type InvoiceLine = { kind?: string; registration?: string | null; start?: string | null; label?: string | null }

// The lines stored with the invoice (the ones its PDF prints): a JSON list, or
// free text typed by an administrator.
const invoiceLines = (stored: string | null | undefined): InvoiceLine[] => {
  if (!stored?.trim()) return []
  try {
    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed.filter((line) => line && typeof line.kind === "string") : []
  } catch {
    return [{ kind: "other", label: stored.trim() }]
  }
}

/** What the invoice is for, in the words of its first line; the payment method only when no line was kept. */
export const invoiceSubject = (invoice: Pick<InvoiceRow, "invoice_items" | "payment_method">): string => {
  const [line, ...others] = invoiceLines(invoice.invoice_items)
  const more = others.length > 0 ? i18n.t("profile:invoices.moreLines", { count: others.length }) : ""
  if (line?.kind === "booking") {
    const subject =
      line.registration && line.start
        ? i18n.t("profile:invoices.subjectBookingOf", { registration: line.registration, date: formatDate(line.start) })
        : i18n.t("profile:invoices.subjectBooking")
    return subject + more
  }
  if (line?.kind === "top_up") return i18n.t("profile:invoices.subjectTopUp") + more
  if (line?.kind === "other" && line.label) return line.label + more
  return i18n.t(`profile:${subjectKey(invoice.payment_method)}`)
}

/** The member's invoices, each one downloadable as a PDF. */
export default function InvoiceList() {
  const { t } = useTranslation("profile")
  const userId = useUserData(useCurrentUser())?.id ?? null
  const [showAll, setShowAll] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const { data, loading, error, refetch } = useQuery<{ invoicesByUser: InvoiceRow[] }>(GET_MEMBER_INVOICES, {
    variables: { userId: Number(userId) },
    skip: !userId,
    fetchPolicy: "cache-and-network",
  })
  const [loadDocument] = useLazyQuery<{ invoiceDocument: { fileName: string; content: string } }>(
    GET_INVOICE_DOCUMENT,
    { fetchPolicy: "network-only" },
  )

  // Most recent first, whatever the order of the answer.
  const invoices = [...(data?.invoicesByUser ?? [])].sort(
    (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime() || Number(b.id) - Number(a.id),
  )
  const shown = showAll ? invoices : invoices.slice(0, SHOWN_AT_FIRST)

  const download = async (invoice: InvoiceRow) => {
    setDownloadingId(String(invoice.id))
    try {
      const { data: result, error: failure } = await loadDocument({ variables: { id: Number(invoice.id) } })
      const file = result?.invoiceDocument
      if (failure || !file) throw failure ?? new Error("No document returned")
      downloadBase64Pdf(file.content, file.fileName)
    } catch {
      toast({
        variant: "destructive",
        title: t("invoices.downloadFailed.title"),
        description: t("invoices.downloadFailed.description"),
      })
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("invoices.title")}</CardTitle>
        <CardDescription>{t("invoices.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!data && (loading || !userId) ? (
          <Skeleton className="h-40 w-full" aria-busy="true" aria-label={t("invoices.loading")} />
        ) : !data && error ? (
          <ErrorState onRetry={() => refetch().catch(() => undefined)} />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t("invoices.empty.title")}
            description={t("invoices.empty.description")}
            className="border-0"
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("invoices.number")}</TableHead>
                    <TableHead>{t("invoices.date")}</TableHead>
                    <TableHead>{t("invoices.subject")}</TableHead>
                    <TableHead className="text-right">{t("invoices.amount")}</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">{t("invoices.downloadColumn")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((invoice) => {
                    const number = invoice.invoice_number || String(invoice.id)
                    const downloading = downloadingId === String(invoice.id)
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="whitespace-nowrap font-medium tabular-nums">{number}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(invoice.invoice_date)}</TableCell>
                        <TableCell>{invoiceSubject(invoice)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(invoice.amount)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={downloadingId !== null}
                            aria-label={t("invoices.download", { number })}
                            title={t("invoices.download", { number })}
                            onClick={() => void download(invoice)}
                          >
                            {downloading ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Download className="h-4 w-4" aria-hidden="true" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            {!showAll && invoices.length > SHOWN_AT_FIRST && (
              <Button variant="outline" onClick={() => setShowAll(true)}>
                {t("invoices.showMore")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
