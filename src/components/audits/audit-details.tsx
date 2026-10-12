"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { useMutation } from "@apollo/client"
import { CheckSquare, Loader2, Pencil } from "lucide-react"
import { CLOSE_AUDIT } from "@/graphql/audit"
import {
  auditCategoryLabel,
  auditCriticality,
  auditFrequencyLabel,
  auditResult,
  auditStatus,
  isAuditOverdue,
} from "@/lib/audit"
import { formatDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidePanel } from "@/components/layout/SidePanel"
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
import { useToast } from "@/components/hooks/use-toast"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"

interface AuditDetailsProps {
  isOpen: boolean
  onClose: () => void
  audit: any
  onEdit: () => void
  /** Called once the audit has been closed, so the list can be refreshed. */
  onClosed?: () => void
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  )
}

export function AuditDetails({ isOpen, onClose, audit, onEdit, onClosed }: AuditDetailsProps) {
  const { toast } = useToast()
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false)
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const userId: string | null = userData?.id ?? null

  const [closeAudit, { loading: closeLoading }] = useMutation(CLOSE_AUDIT, {
    onCompleted: () => {
      toast({ title: "Audit clôturé" })
      setIsCloseConfirmOpen(false)
      onClosed?.()
      onClose()
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Clôture impossible",
        description: "L'audit n'a pas pu être clôturé. Réessayez dans un instant.",
      })
      setIsCloseConfirmOpen(false)
    },
  })

  const handleCloseAudit = () => {
    if (!userId) return
    closeAudit({
      variables: {
        id: audit.id,
        closedById: userId,
      },
    })
  }

  const result = auditResult(audit?.audit_result)
  const status = auditStatus(audit ?? {})
  const overdue = isAuditOverdue(audit ?? {})
  const auditor = [audit?.auditor?.first_name, audit?.auditor?.last_name].filter(Boolean).join(" ")
  const closedBy = [audit?.closed_by?.first_name, audit?.closed_by?.last_name].filter(Boolean).join(" ")
  const items: any[] = audit?.audit_items ?? []

  const groupedItems = items.reduce((acc: Record<string, any[]>, item: any) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <>
      <SidePanel
        open={isOpen}
        onOpenChange={(open) => !open && onClose()}
        title={`Audit du ${formatDate(audit?.audit_date)}`}
        description={
          [audit?.aircraft?.registration_number, audit?.aircraft?.model].filter(Boolean).join(" · ") || "—"
        }
        footer={
          <>
            <Button variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Modifier
            </Button>
            {!audit?.is_closed && (
              <Button onClick={() => setIsCloseConfirmOpen(true)} disabled={!userId}>
                <CheckSquare className="h-4 w-4" />
                Clôturer l'audit
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant={result.variant}>{result.label}</Badge>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Fact label="Auditeur">{auditor || "—"}</Fact>
            <Fact label="Fréquence">{auditFrequencyLabel(audit?.audit_frequency)}</Fact>
            <Fact label="Prochain audit">
              <span className={overdue ? "text-destructive" : undefined}>{formatDate(audit?.next_audit_date)}</span>
            </Fact>
            {/* Only shown when the API returned them with the audit. */}
            {audit?.is_closed && audit?.closed_date && <Fact label="Clôturé le">{formatDate(audit.closed_date)}</Fact>}
            {audit?.is_closed && closedBy && <Fact label="Clôturé par">{closedBy}</Fact>}
          </dl>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold">Notes</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                {audit?.audit_notes || "Aucune note."}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Actions correctives</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                {audit?.corrective_actions || "Aucune action corrective."}
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">
              Éléments vérifiés <span className="font-normal text-muted-foreground">({items.length})</span>
            </h3>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cet audit ne contient aucun élément vérifié.</p>
            ) : (
              Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {auditCategoryLabel(category)}
                  </h4>
                  <ul className="divide-y rounded-lg border">
                    {categoryItems.map((item: any) => {
                      const itemResult = auditResult(item.result)
                      return (
                        <li key={item.id} className="space-y-1.5 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium">{item.description}</p>
                            <Badge variant={itemResult.variant} className="shrink-0 whitespace-nowrap">
                              {itemResult.label}
                            </Badge>
                          </div>
                          {item.notes && (
                            <p className="whitespace-pre-line text-sm text-muted-foreground">{item.notes}</p>
                          )}
                          {(item.criticality || item.requires_action || item.requires_photo_evidence) && (
                            <div className="flex flex-wrap gap-2">
                              {item.criticality && (
                                <Badge variant={auditCriticality(item.criticality).variant}>
                                  {auditCriticality(item.criticality).label}
                                </Badge>
                              )}
                              {item.requires_action && <Badge variant="warning">Action corrective requise</Badge>}
                              {item.requires_photo_evidence && <Badge variant="info">Photo requise</Badge>}
                            </div>
                          )}
                          {(item.inspection_method || item.expected_result || item.reference_documentation) && (
                            <dl className="space-y-0.5 text-xs text-muted-foreground">
                              {item.inspection_method && (
                                <div>
                                  <dt className="inline font-medium">Méthode d'inspection : </dt>
                                  <dd className="inline">{item.inspection_method}</dd>
                                </div>
                              )}
                              {item.expected_result && (
                                <div>
                                  <dt className="inline font-medium">Résultat attendu : </dt>
                                  <dd className="inline">{item.expected_result}</dd>
                                </div>
                              )}
                              {item.reference_documentation && (
                                <div>
                                  <dt className="inline font-medium">Documentation : </dt>
                                  <dd className="inline">{item.reference_documentation}</dd>
                                </div>
                              )}
                            </dl>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))
            )}
          </section>
        </div>

      </SidePanel>

      <AlertDialog open={isCloseConfirmOpen} onOpenChange={(open) => !open && !closeLoading && setIsCloseConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clôturer cet audit ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'audit du {formatDate(audit?.audit_date)} de l'aéronef {audit?.aircraft?.registration_number ?? "—"} sera
              marqué comme clôturé à votre nom.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closeLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              // Keep the dialog open until the mutation answers.
              onClick={(e) => {
                e.preventDefault()
                handleCloseAudit()
              }}
              disabled={closeLoading}
            >
              {closeLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Clôturer l'audit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
