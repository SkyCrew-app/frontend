"use client"

import { useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery, useMutation } from "@apollo/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft } from "lucide-react"
import { useToast } from "@/components/hooks/use-toast"
import { PageHeader } from "@/components/layout/PageHeader"
import { ErrorState } from "@/components/layout/ErrorState"
import {
  GET_CHECKLIST_SUBMISSION,
  UPDATE_CHECKLIST_SUBMISSION,
  COMPLETE_CHECKLIST_SUBMISSION,
} from "@/graphql/checklist"
import { ChecklistSubmission, ChecklistSubmissionStatus, ChecklistResponse } from "@/interfaces/checklist"
import { ChecklistForm } from "@/components/checklists/ChecklistForm"
import { checklistStatus } from "@/lib/checklist-items"
import { formatDateTime } from "@/lib/format"
import { useTranslation } from "react-i18next"

export default function ChecklistDetailPage() {
  const { t } = useTranslation("checklists")
  const params = useParams()
  const { toast } = useToast()
  const id = Number(params.id)

  const { data, loading, error, refetch } = useQuery(GET_CHECKLIST_SUBMISSION, {
    variables: { id },
    skip: !id,
    fetchPolicy: "network-only",
  })

  const [updateSubmission] = useMutation(UPDATE_CHECKLIST_SUBMISSION)
  const [completeSubmission] = useMutation(COMPLETE_CHECKLIST_SUBMISSION)

  const submission: ChecklistSubmission | undefined = data?.checklistSubmission

  // Resolves to false when the save failed: the form then shows it and offers to retry.
  const handleUpdate = useCallback(
    async (responses: ChecklistResponse[]): Promise<boolean> => {
      try {
        await updateSubmission({
          variables: {
            input: {
              id,
              responses: responses.map((r) => ({
                itemId: r.itemId,
                checked: r.checked,
                note: r.note || undefined,
              })),
            },
          },
        })
        return true
      } catch {
        toast({
          variant: "destructive",
          title: t("toast.answersNotSaved.title"),
          description: t("toast.answersNotSaved.description"),
        })
        return false
      }
    },
    [id, updateSubmission, toast, t],
  )

  const handleComplete = useCallback(async () => {
    try {
      await completeSubmission({
        variables: { id },
        refetchQueries: [{ query: GET_CHECKLIST_SUBMISSION, variables: { id } }],
      })
      toast({ title: t("toast.completed.title") })
    } catch {
      toast({
        variant: "destructive",
        title: t("toast.completeFailed.title"),
        description: t("toast.completeFailed.description"),
      })
    }
  }, [id, completeSubmission, toast, t])

  const backButton = (
    <Button variant="outline" asChild>
      <Link href="/checklists">
        <ArrowLeft className="h-4 w-4" />
        {t("detail.back")}
      </Link>
    </Button>
  )

  if (loading && !submission) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader title={<Skeleton className="h-8 w-56" />} actions={backButton} className="mb-0" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !submission) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader title={t("detail.title")} actions={backButton} className="mb-0" />
        <ErrorState
          description={t("detail.loadError")}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  const status = checklistStatus(submission.status)
  const isCompleted = submission.status === ChecklistSubmissionStatus.COMPLETED

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={submission.template.name}
        description={submission.template.aircraft_model}
        actions={backButton}
        className="mb-0"
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <Badge variant={status.variant}>{status.label}</Badge>
        <span>
          {isCompleted && submission.completed_at
            ? t("submission.completedOn", { date: formatDateTime(submission.completed_at) })
            : t("submission.startedOn", { date: formatDateTime(submission.started_at) })}
        </span>
      </div>

      {submission.template.description && (
        <p className="text-sm text-muted-foreground">{submission.template.description}</p>
      )}

      <ChecklistForm
        key={submission.id}
        submission={submission}
        items={submission.template.items || []}
        onUpdate={handleUpdate}
        onComplete={handleComplete}
      />
    </div>
  )
}
