"use client"

import { useState } from "react"
import { useMutation } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { ArrowDown, ArrowUp, ClipboardCheck, Eye, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { DELETE_AUDIT } from "@/graphql/audit"
import { auditResult, auditStatus, isAuditOverdue } from "@/lib/audit"
import { formatDate } from "@/lib/format"
import { currentLocale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AuditDetails } from "@/components/audits/audit-details"
import { EditAuditDialog } from "@/components/audits/edit-audit-dialog"
import { useToast } from "@/components/hooks/use-toast"

interface AuditListProps {
  loading: boolean
  error: any
  audits: any[]
  searchTerm: string
  /** True when a search, a filter or a status tab narrows the list. */
  hasActiveFilters?: boolean
  onCreate?: () => void
  onRefetch: () => void
}

type SortField = "audit_date" | "aircraft" | "auditor" | "audit_result" | "next_audit_date"

const COLUMNS: { field: SortField; className?: string }[] = [
  { field: "audit_date" },
  { field: "aircraft" },
  { field: "auditor", className: "hidden md:table-cell" },
  { field: "audit_result" },
  { field: "next_audit_date", className: "hidden lg:table-cell" },
]

const auditorName = (audit: any) =>
  [audit.auditor?.first_name, audit.auditor?.last_name].filter(Boolean).join(" ")

const sortValue = (audit: any, field: SortField): string | number => {
  switch (field) {
    case "audit_date":
      return new Date(audit.audit_date).getTime()
    case "next_audit_date":
      return audit.next_audit_date ? new Date(audit.next_audit_date).getTime() : 0
    case "aircraft":
      return audit.aircraft?.registration_number ?? ""
    case "auditor":
      return auditorName(audit)
    case "audit_result":
      return auditResult(audit.audit_result).label
  }
}

export function AuditList({
  loading,
  error,
  audits,
  searchTerm,
  hasActiveFilters = false,
  onCreate,
  onRefetch,
}: AuditListProps) {
  const { t } = useTranslation("administration")
  const { toast } = useToast()
  const [sortField, setSortField] = useState<SortField>("audit_date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [auditToDelete, setAuditToDelete] = useState<any | null>(null)

  const [deleteAudit, { loading: deleteLoading }] = useMutation(DELETE_AUDIT, {
    onCompleted: () => {
      toast({ title: t("audits.list.toast.deleted") })
      onRefetch()
      setAuditToDelete(null)
    },
    onError: () => {
      toast({
        title: t("audits.list.toast.deleteFailed.title"),
        description: t("audits.list.toast.deleteFailed.description"),
        variant: "destructive",
      })
    },
  })

  // Read from the list rather than kept as a copy, so the dialogs follow a refetch.
  const selectedAudit = audits.find((audit) => audit.id === selectedAuditId) ?? null

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleViewDetails = (audit: any) => {
    setSelectedAuditId(audit.id)
    setIsDetailsOpen(true)
  }

  const handleEdit = (audit: any) => {
    setSelectedAuditId(audit.id)
    setIsEditOpen(true)
  }

  const confirmDelete = () => {
    if (auditToDelete) {
      deleteAudit({ variables: { id: auditToDelete.id } })
    }
  }

  const searchLower = searchTerm.trim().toLowerCase()
  const filteredAudits = audits.filter(
    (audit) =>
      !searchLower ||
      [audit.aircraft?.registration_number, audit.aircraft?.model, auditorName(audit), audit.audit_notes].some(
        (value) => typeof value === "string" && value.toLowerCase().includes(searchLower),
      ),
  )

  const sortedAudits = [...filteredAudits].sort((a, b) => {
    const valueA = sortValue(a, sortField)
    const valueB = sortValue(b, sortField)
    const order =
      typeof valueA === "string" || typeof valueB === "string"
        ? String(valueA).localeCompare(String(valueB), currentLocale())
        : valueA - valueB
    return sortDirection === "asc" ? order : -order
  })

  const auditMenu = (audit: any) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label={t("audits.list.actionsFor", { date: formatDate(audit.audit_date) })}
          title={t("common:labels.actions")}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="gap-2" onSelect={() => handleViewDetails(audit)}>
          <Eye className="h-4 w-4" />
          {t("audits.list.viewDetails")}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" onSelect={() => handleEdit(audit)}>
          <Pencil className="h-4 w-4" />
          {t("common:actions.edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-destructive focus:text-destructive"
          onSelect={() => setAuditToDelete(audit)}
        >
          <Trash2 className="h-4 w-4" />
          {t("common:actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (loading && audits.length === 0) {
    return (
      <Card className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </Card>
    )
  }

  if (error) return <ErrorState onRetry={() => onRefetch()} />

  return (
    <>
      {sortedAudits.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            icon={ClipboardCheck}
            title={t("audits.list.noMatch.title")}
            description={t("audits.list.noMatch.description")}
          />
        ) : (
          <EmptyState
            icon={ClipboardCheck}
            title={t("audits.list.empty.title")}
            description={t("audits.list.empty.description")}
            action={
              onCreate && (
                <Button onClick={onCreate}>
                  <Plus className="h-4 w-4" />
                  {t("audits.newAudit")}
                </Button>
              )
            }
          />
        )
      ) : (
        <>
          {/* Wide screens: a sortable table. */}
          <Card className="hidden overflow-hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((column) => (
                    <TableHead
                      key={column.field}
                      className={cn("whitespace-nowrap", column.className)}
                      aria-sort={
                        sortField === column.field ? (sortDirection === "asc" ? "ascending" : "descending") : "none"
                      }
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(column.field)}
                        className="inline-flex items-center gap-2 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {t(`audits.list.columns.${column.field}`)}
                        {sortField === column.field &&
                          (sortDirection === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                          ))}
                      </button>
                    </TableHead>
                  ))}
                  <TableHead className="whitespace-nowrap">{t("common:labels.status")}</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">{t("common:labels.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAudits.map((audit) => {
                  const result = auditResult(audit.audit_result)
                  const status = auditStatus(audit)
                  const overdue = isAuditOverdue(audit)
                  return (
                    <TableRow key={audit.id} className="cursor-pointer" onClick={() => handleViewDetails(audit)}>
                      <TableCell className="whitespace-nowrap font-medium">{formatDate(audit.audit_date)}</TableCell>
                      <TableCell>
                        <span className="block whitespace-nowrap font-medium">
                          {audit.aircraft?.registration_number ?? "—"}
                        </span>
                        {audit.aircraft?.model && (
                          <span className="block text-xs text-muted-foreground">{audit.aircraft.model}</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap md:table-cell">
                        {auditorName(audit) || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={result.variant} className="whitespace-nowrap">
                          {result.label}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn("hidden whitespace-nowrap lg:table-cell", overdue && "text-destructive")}
                      >
                        {formatDate(audit.next_audit_date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="whitespace-nowrap">
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {auditMenu(audit)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Phones and tablets: one card per audit, newest first. */}
          <ul className="space-y-3 lg:hidden" aria-label={t("audits.tabs.audits")}>
            {sortedAudits.map((audit) => {
              const result = auditResult(audit.audit_result)
              const status = auditStatus(audit)
              const overdue = isAuditOverdue(audit)
              return (
                <li key={audit.id}>
                  <Card className="flex items-start gap-2 p-4">
                    <button
                      type="button"
                      onClick={() => handleViewDetails(audit)}
                      className="min-w-0 flex-1 space-y-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium">{audit.aircraft?.registration_number ?? "—"}</span>
                        {audit.aircraft?.model && (
                          <span className="text-sm text-muted-foreground">{audit.aircraft.model}</span>
                        )}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {formatDate(audit.audit_date)}
                        {auditorName(audit) && ` · ${auditorName(audit)}`}
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        <Badge variant={result.variant}>{result.label}</Badge>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </span>
                      {audit.next_audit_date && (
                        <span className="block text-sm">
                          <span className="text-muted-foreground">{t("audits.list.columns.next_audit_date")}</span>{" "}
                          <span className={cn(overdue && "text-destructive")}>{formatDate(audit.next_audit_date)}</span>
                        </span>
                      )}
                    </button>
                    {auditMenu(audit)}
                  </Card>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {selectedAudit && (
        <>
          <AuditDetails
            isOpen={isDetailsOpen}
            onClose={() => setIsDetailsOpen(false)}
            audit={selectedAudit}
            onEdit={() => {
              setIsDetailsOpen(false)
              setIsEditOpen(true)
            }}
            onClosed={onRefetch}
          />
          <EditAuditDialog
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            audit={selectedAudit}
            onSuccess={() => {
              onRefetch()
              setIsEditOpen(false)
            }}
          />
        </>
      )}

      <AlertDialog open={auditToDelete !== null} onOpenChange={(open) => !open && !deleteLoading && setAuditToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("audits.list.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("audits.list.deleteConfirm.description", {
                date: formatDate(auditToDelete?.audit_date),
                registration: auditToDelete?.aircraft?.registration_number ?? "—",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              // Keep the dialog open until the mutation answers.
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("common:actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
