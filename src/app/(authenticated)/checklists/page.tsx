"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation } from "@apollo/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowRight, ClipboardCheck, Loader2, Plus } from "lucide-react"
import { useToast } from "@/components/hooks/use-toast"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { GET_CHECKLIST_SUBMISSIONS, GET_CHECKLIST_TEMPLATES, START_CHECKLIST_SUBMISSION } from "@/graphql/checklist"
import { ChecklistSubmission, ChecklistSubmissionStatus, ChecklistTemplate } from "@/interfaces/checklist"
import { ChecklistProgress } from "@/components/checklists/ChecklistProgress"
import { checklistStatus, submissionProgress } from "@/lib/checklist-items"
import { formatDateTime } from "@/lib/format"

const HISTORY_PREVIEW = 6

const byMostRecent = (a: ChecklistSubmission, b: ChecklistSubmission) =>
  new Date(b.completed_at ?? b.started_at).getTime() - new Date(a.completed_at ?? a.started_at).getTime()

// One card anatomy for every checklist: title, status, facts, action bottom right.
function SubmissionCard({ submission }: { submission: ChecklistSubmission }) {
  const status = checklistStatus(submission.status)
  const { checked, total } = submissionProgress(submission)
  const inProgress = submission.status === ChecklistSubmissionStatus.IN_PROGRESS
  const isCompleted = submission.status === ChecklistSubmissionStatus.COMPLETED

  return (
    <Link
      href={`/checklists/${submission.id}`}
      className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base">{submission.template.name}</CardTitle>
            <Badge variant={status.variant} className="shrink-0">
              {status.label}
            </Badge>
          </div>
          <CardDescription>{submission.template.aircraft_model}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 space-y-3 pb-3">
          {inProgress ? (
            <ChecklistProgress checked={checked} total={total} />
          ) : (
            <p className="text-sm tabular-nums text-muted-foreground">
              {checked} / {total} {total > 1 ? "points vérifiés" : "point vérifié"}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {isCompleted && submission.completed_at
              ? `Terminée le ${formatDateTime(submission.completed_at)}`
              : `Commencée le ${formatDateTime(submission.started_at)}`}
          </p>
        </CardContent>
        <CardFooter className="justify-end pt-0">
          <span className="flex items-center gap-1 text-sm font-medium text-primary">
            {inProgress ? "Reprendre" : "Consulter"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  )
}

export default function ChecklistsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [showAllHistory, setShowAllHistory] = useState(false)

  const {
    data: submissionsData,
    loading: loadingSubmissions,
    error: errorSubmissions,
    refetch,
  } = useQuery(GET_CHECKLIST_SUBMISSIONS, {
    fetchPolicy: "network-only",
  })

  const { data: templatesData, loading: loadingTemplates } = useQuery(GET_CHECKLIST_TEMPLATES)

  const [startSubmission, { loading: starting }] = useMutation(START_CHECKLIST_SUBMISSION)

  const submissions: ChecklistSubmission[] = submissionsData?.checklistSubmissions || []
  const templates: ChecklistTemplate[] =
    templatesData?.checklistTemplates?.filter((t: ChecklistTemplate) => t.is_active) || []

  const inProgress = submissions.filter((s) => s.status === ChecklistSubmissionStatus.IN_PROGRESS).sort(byMostRecent)
  // Everything that is no longer being filled in, cancelled ones included.
  const history = submissions.filter((s) => s.status !== ChecklistSubmissionStatus.IN_PROGRESS).sort(byMostRecent)
  const visibleHistory = showAllHistory ? history : history.slice(0, HISTORY_PREVIEW)

  // With a single template there is nothing to choose.
  const templateId = selectedTemplateId || (templates.length === 1 ? String(templates[0].id) : "")

  const handleStartChecklist = async () => {
    if (!templateId || !userData?.id) return
    try {
      const { data } = await startSubmission({
        variables: {
          input: {
            templateId: Number(templateId),
            responses: [],
          },
        },
        refetchQueries: [{ query: GET_CHECKLIST_SUBMISSIONS }],
      })

      setIsNewDialogOpen(false)
      setSelectedTemplateId("")

      if (data?.startChecklistSubmission?.id) {
        router.push(`/checklists/${data.startChecklistSubmission.id}`)
      }
    } catch {
      toast({
        variant: "destructive",
        title: "La checklist n'a pas pu être démarrée",
        description: "Réessayez dans un instant.",
      })
    }
  }

  const newButton = (
    <Button onClick={() => setIsNewDialogOpen(true)}>
      <Plus className="h-4 w-4" />
      Nouvelle checklist
    </Button>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklists"
        description="Vos vérifications avant le vol, point par point."
        actions={newButton}
        className="mb-0"
      />

      {loadingSubmissions && submissions.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : errorSubmissions ? (
        <ErrorState onRetry={() => refetch()} />
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Aucune checklist pour le moment"
          description="Démarrez une checklist avant votre prochain vol : vos réponses s'enregistrent au fur et à mesure."
          action={newButton}
        />
      ) : (
        <>
          {inProgress.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">En cours</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inProgress.map((sub) => (
                  <SubmissionCard key={sub.id} submission={sub} />
                ))}
              </div>
            </section>
          )}

          {history.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Historique</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {visibleHistory.map((sub) => (
                  <SubmissionCard key={sub.id} submission={sub} />
                ))}
              </div>
              {history.length > HISTORY_PREVIEW && (
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => setShowAllHistory(!showAllHistory)}>
                    {showAllHistory ? "Afficher moins" : `Afficher les ${history.length} checklists`}
                  </Button>
                </div>
              )}
            </section>
          )}
        </>
      )}

      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Démarrer une checklist</DialogTitle>
            <DialogDescription>Choisissez le modèle correspondant à l&apos;avion que vous préparez.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="checklist-template">Modèle de checklist</Label>
            {loadingTemplates && templates.length === 0 ? (
              <Skeleton className="h-10 w-full" />
            ) : templates.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Aucun modèle de checklist n&apos;est disponible. Demandez à un administrateur du club d&apos;en activer un.
              </p>
            ) : (
              <Select value={templateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger id="checklist-template">
                  <SelectValue placeholder="Choisir un modèle" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={String(t.id)} value={String(t.id)}>
                      {t.name} — {t.aircraft_model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsNewDialogOpen(false)} disabled={starting}>
              Annuler
            </Button>
            <Button onClick={handleStartChecklist} disabled={!templateId || !userData?.id || starting}>
              {starting && <Loader2 className="h-4 w-4 animate-spin" />}
              Démarrer la checklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
