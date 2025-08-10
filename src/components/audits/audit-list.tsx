"use client"

import { useState } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useMutation } from "@apollo/client"
import {
  Calendar,
  Plane,
  User,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash,
  XCircle,
  Info,
} from "lucide-react"
import { DELETE_AUDIT } from "@/graphql/audit"
import { AuditResultType } from "@/interfaces/audit"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Card, CardContent } from "@/components/ui/card"
import { AuditDetails } from "@/components/audits/audit-details"
import { EditAuditDialog } from "@/components/audits/edit-audit-dialog"
import { useToast } from "@/components/hooks/use-toast"
import { useMediaQuery } from "@/hooks/use-media-query"

interface AuditListProps {
  loading: boolean
  error: any
  audits: any[]
  searchTerm: string
  onRefetch: () => void
}

export function AuditList({ loading, error, audits, searchTerm, onRefetch }: AuditListProps) {
  const { toast } = useToast()
  const [sortField, setSortField] = useState<string>("audit_date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [auditToDelete, setAuditToDelete] = useState<number | null>(null)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const isMobile = useMediaQuery("(max-width: 768px)")

  const [deleteAudit, { loading: deleteLoading }] = useMutation(DELETE_AUDIT, {
    onCompleted: () => {
      toast({ title: "Audit supprimé avec succès", variant: "default" })
      onRefetch()
      setIsDeleteDialogOpen(false)
    },
    onError: (error) => {
      toast({ title: "Erreur lors de la suppression", description: error.message, variant: "destructive" })
    },
  })

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleViewDetails = (audit: any) => {
    setSelectedAudit(audit)
    setIsDetailsOpen(true)
  }

  const handleEdit = (audit: any) => {
    setSelectedAudit(audit)
    setIsEditOpen(true)
  }

  const handleDelete = (id: number) => {
    setAuditToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (auditToDelete) {
      deleteAudit({
        variables: {
          id: auditToDelete,
        },
      })
    }
  }

  const getAuditResultIcon = (result: AuditResultType) => {
    switch (result) {
      case AuditResultType.CONFORME:
        return <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
      case AuditResultType.NON_CONFORME:
        return <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
      case AuditResultType.CONFORME_AVEC_REMARQUES:
        return <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
      case AuditResultType.NON_APPLICABLE:
        return <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
      default:
        return null
    }
  }

  const getAuditResultLabel = (result: AuditResultType) => {
    switch (result) {
      case AuditResultType.CONFORME:
        return "Conforme"
      case AuditResultType.NON_CONFORME:
        return "Non conforme"
      case AuditResultType.CONFORME_AVEC_REMARQUES:
        return "Conforme avec remarques"
      case AuditResultType.NON_APPLICABLE:
        return "Non applicable"
      default:
        return "Inconnu"
    }
  }

  const getAuditResultLabelShort = (result: AuditResultType) => {
    switch (result) {
      case AuditResultType.CONFORME:
        return "Conforme"
      case AuditResultType.NON_CONFORME:
        return "Non conf."
      case AuditResultType.CONFORME_AVEC_REMARQUES:
        return "Avec rem."
      case AuditResultType.NON_APPLICABLE:
        return "N/A"
      default:
        return "Inconnu"
    }
  }

  const getAuditResultBadgeVariant = (result: AuditResultType) => {
    switch (result) {
      case AuditResultType.CONFORME:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case AuditResultType.NON_CONFORME:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case AuditResultType.CONFORME_AVEC_REMARQUES:
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
      case AuditResultType.NON_APPLICABLE:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      default:
        return ""
    }
  }

  const isOverdue = (audit: any) => {
    return audit.next_audit_date && new Date(audit.next_audit_date) < new Date() && !audit.is_closed
  }

  const formatDate = (date: string) => {
    if (isMobile) {
      return format(new Date(date), "dd/MM/yy", { locale: fr })
    }
    return format(new Date(date), "dd MMM yyyy", { locale: fr })
  }

  const filteredAudits = audits.filter((audit) => {
    const searchLower = localSearchTerm.toLowerCase()
    return (
      audit.aircraft.registration_number.toLowerCase().includes(searchLower) ||
      audit.aircraft.model.toLowerCase().includes(searchLower) ||
      `${audit.auditor.first_name} ${audit.auditor.last_name}`.toLowerCase().includes(searchLower) ||
      (audit.audit_notes && audit.audit_notes.toLowerCase().includes(searchLower))
    )
  })

  const sortedAudits = [...filteredAudits].sort((a, b) => {
    let valueA, valueB

    switch (sortField) {
      case "audit_date":
        valueA = new Date(a.audit_date).getTime()
        valueB = new Date(b.audit_date).getTime()
        break
      case "next_audit_date":
        valueA = a.next_audit_date ? new Date(a.next_audit_date).getTime() : 0
        valueB = b.next_audit_date ? new Date(b.next_audit_date).getTime() : 0
        break
      case "aircraft":
        valueA = a.aircraft.registration_number
        valueB = b.aircraft.registration_number
        break
      case "auditor":
        valueA = `${a.auditor.first_name} ${a.auditor.last_name}`
        valueB = `${b.auditor.first_name} ${b.auditor.last_name}`
        break
      case "audit_result":
        valueA = a.audit_result
        valueB = b.audit_result
        break
      default:
        valueA = a[sortField]
        valueB = b[sortField]
    }

    if (sortDirection === "asc") {
      return valueA > valueB ? 1 : -1
    } else {
      return valueA < valueB ? 1 : -1
    }
  })

  if (loading)
    return (
      <div className="flex h-36 sm:h-48 w-full items-center justify-center">
        <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary" />
      </div>
    )

  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-2xs sm:text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        Erreur lors du chargement des audits: {error.message}
      </div>
    )

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Rechercher un audit..."
          className="pl-8 h-8 sm:h-9 text-xs sm:text-sm"
          value={localSearchTerm}
          onChange={(e) => setLocalSearchTerm(e.target.value)}
          aria-label="Rechercher un audit"
        />
      </div>

      {sortedAudits.length === 0 ? (
        <div className="flex h-36 sm:h-48 w-full items-center justify-center rounded-lg border border-dashed p-4 text-center">
          <div className="space-y-1">
            <p className="text-sm sm:text-base font-medium">Aucun audit trouvé</p>
            <p className="text-2xs sm:text-xs text-muted-foreground">
              {localSearchTerm
                ? "Essayez de modifier vos critères de recherche."
                : "Commencez par ajouter un nouvel audit."}
            </p>
          </div>
        </div>
      ) : isMobile ? (
        <div className="space-y-3">
          {sortedAudits.map((audit) => (
            <Card
              key={audit.id}
              className={`overflow-hidden ${isOverdue(audit) ? "border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10" : ""}`}
              onClick={() => handleViewDetails(audit)}
            >
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <Plane className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-xs">{audit.aircraft.registration_number}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-primary" />
                      <span className="text-2xs text-muted-foreground">{formatDate(audit.audit_date)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant="outline"
                      className={`flex items-center gap-0.5 h-5 px-1.5 text-2xs ${getAuditResultBadgeVariant(audit.audit_result)}`}
                    >
                      {getAuditResultIcon(audit.audit_result)}
                      {getAuditResultLabelShort(audit.audit_result)}
                    </Badge>
                    {isOverdue(audit) && (
                      <Badge
                        variant="outline"
                        className="h-5 px-1.5 text-2xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                      >
                        En retard
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-primary" />
                    <span className="text-2xs text-muted-foreground line-clamp-1">
                      {audit.auditor.first_name} {audit.auditor.last_name}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(audit)
                      }}
                      aria-label="Modifier l'audit"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(audit.id)
                      }}
                      aria-label="Supprimer l'audit"
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] sm:w-[120px] cursor-pointer" onClick={() => handleSort("audit_date")}>
                    <div className="flex items-center">
                      <span className="text-xs sm:text-sm">Date d'audit</span>
                      {sortField === "audit_date" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <ChevronDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("aircraft")}>
                    <div className="flex items-center">
                      <span className="text-xs sm:text-sm">Aéronef</span>
                      {sortField === "aircraft" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <ChevronDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead className="hidden md:table-cell cursor-pointer" onClick={() => handleSort("auditor")}>
                    <div className="flex items-center">
                      <span className="text-xs sm:text-sm">Auditeur</span>
                      {sortField === "auditor" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <ChevronDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("audit_result")}>
                    <div className="flex items-center">
                      <span className="text-xs sm:text-sm">Résultat</span>
                      {sortField === "audit_result" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <ChevronDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="hidden md:table-cell cursor-pointer"
                    onClick={() => handleSort("next_audit_date")}
                  >
                    <div className="flex items-center">
                      <span className="text-xs sm:text-sm">Prochain audit</span>
                      {sortField === "next_audit_date" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <ChevronDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead className="w-[60px] sm:w-[80px] text-right">
                    <span className="text-xs sm:text-sm">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAudits.map((audit) => (
                  <TableRow
                    key={audit.id}
                    className={`text-xs sm:text-sm ${isOverdue(audit) ? "bg-red-50/50 dark:bg-red-950/10" : ""}`}
                    onClick={() => handleViewDetails(audit)}
                    style={{ cursor: "pointer" }}
                  >
                    <TableCell className="py-2 px-3 sm:py-3 sm:px-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium">{formatDate(audit.audit_date)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3 sm:py-3 sm:px-4">
                      <div className="flex items-center gap-1">
                        <Plane className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium">{audit.aircraft.registration_number}</span>
                        <span className="hidden sm:inline text-2xs sm:text-xs text-muted-foreground">
                          ({audit.aircraft.model})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2 px-3 sm:py-3 sm:px-4">
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span>
                          {audit.auditor.first_name} {audit.auditor.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3 sm:py-3 sm:px-4">
                      <Badge
                        variant="outline"
                        className={`flex items-center gap-1 h-5 sm:h-6 text-2xs sm:text-xs ${getAuditResultBadgeVariant(audit.audit_result)}`}
                      >
                        {getAuditResultIcon(audit.audit_result)}
                        <span className="hidden sm:inline">{getAuditResultLabel(audit.audit_result)}</span>
                        <span className="sm:hidden">{getAuditResultLabelShort(audit.audit_result)}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2 px-3 sm:py-3 sm:px-4">
                      {audit.next_audit_date ? (
                        <div className="flex items-center gap-1">
                          <Clock className={`h-3.5 w-3.5 ${isOverdue(audit) ? "text-red-500" : "text-primary"}`} />
                          <span className={isOverdue(audit) ? "text-red-600 dark:text-red-400" : ""}>
                            {formatDate(audit.next_audit_date)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-2xs sm:text-xs">Non planifié</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-3 sm:py-3 sm:px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 sm:h-7 sm:w-7"
                          onClick={() => handleEdit(audit)}
                          aria-label="Modifier l'audit"
                        >
                          <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 sm:h-7 sm:w-7 text-red-500/80 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => handleDelete(audit.id)}
                          aria-label="Supprimer l'audit"
                        >
                          <Trash className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 sm:h-7 sm:w-7"
                          onClick={() => handleViewDetails(audit)}
                          aria-label="Voir les détails de l'audit"
                        >
                          <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm sm:text-base">
              Êtes-vous sûr de vouloir supprimer cet audit ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-2xs sm:text-xs">
              Cette action est irréversible. Toutes les données associées à cet audit seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-3 sm:mt-4 flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="text-2xs sm:text-xs h-7 sm:h-8">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 text-2xs sm:text-xs h-7 sm:h-8"
            >
              {deleteLoading ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
