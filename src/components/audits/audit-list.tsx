"use client"

import { useState } from "react"
import { useMutation } from "@apollo/client"
import { ArrowDown, ArrowUp, ClipboardCheck, Eye, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { DELETE_AUDIT } from "@/graphql/audit"
import { auditResult, auditStatus, isAuditOverdue } from "@/lib/audit"
import { formatDate } from "@/lib/format"
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

const COLUMNS: { field: SortField; label: string; className?: string }[] = [
  { field: "audit_date", label: "Date" },
  { field: "aircraft", label: "Aéronef" },
  { field: "auditor", label: "Auditeur", className: "hidden md:table-cell" },
  { field: "audit_result", label: "Résultat" },
  { field: "next_audit_date", label: "Prochain audit", className: "hidden lg:table-cell" },
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
  const { toast } = useToast()
  const [sortField, setSortField] = useState<SortField>("audit_date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [auditToDelete, setAuditToDelete] = useState<any | null>(null)

  const [deleteAudit, { loading: deleteLoading }] = useMutation(DELETE_AUDIT, {
    onCompleted: () => {
      toast({ title: "Audit supprimé" })
      onRefetch()
      setAuditToDelete(null)
    },
    onError: () => {
      toast({
        title: "Suppression impossible",
        description: "L'audit n'a pas pu être supprimé. Réessayez dans un instant.",
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
        ? String(valueA).localeCompare(String(valueB), "fr")
        : valueA - valueB
    return sortDirection === "asc" ? order : -order
  })

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
            title="Aucun audit ne correspond"
            description="Modifiez la recherche, les filtres ou l'onglet sélectionné."
          />
        ) : (
          <EmptyState
            icon={ClipboardCheck}
            title="Aucun audit pour le moment"
            description="Enregistrez le premier audit de sécurité d'un aéronef."
            action={
              onCreate && (
                <Button onClick={onCreate}>
                  <Plus className="h-4 w-4" />
                  Nouvel audit
                </Button>
              )
            }
          />
        )
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
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
                        {column.label}
                        {sortField === column.field &&
                          (sortDirection === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                          ))}
                      </button>
                    </TableHead>
                  ))}
                  <TableHead className="whitespace-nowrap">Statut</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAudits.map((audit) => {
                  const result = auditResult(audit.audit_result)
                  const status = auditStatus(audit)
                  const overdue = isAuditOverdue(audit)
                  const label = `l'audit du ${formatDate(audit.audit_date)}`
                  return (
                    <TableRow key={audit.id} className="cursor-pointer" onClick={() => handleViewDetails(audit)}>
                      <TableCell className="whitespace-nowrap font-medium">{formatDate(audit.audit_date)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="font-medium">{audit.aircraft?.registration_number ?? "—"}</span>
                        {audit.aircraft?.model && (
                          <span className="ml-2 hidden text-muted-foreground sm:inline">{audit.aircraft.model}</span>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              aria-label={`Actions pour ${label}`}
                              title="Actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2" onSelect={() => handleViewDetails(audit)}>
                              <Eye className="h-4 w-4" />
                              Voir le détail
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onSelect={() => handleEdit(audit)}>
                              <Pencil className="h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 text-destructive focus:text-destructive"
                              onSelect={() => setAuditToDelete(audit)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
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
            <AlertDialogTitle>Supprimer cet audit ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'audit du {formatDate(auditToDelete?.audit_date)} de l'aéronef{" "}
              {auditToDelete?.aircraft?.registration_number ?? "—"} et ses éléments vérifiés seront définitivement
              supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Annuler</AlertDialogCancel>
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
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
