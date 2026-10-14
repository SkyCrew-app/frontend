"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation } from "@apollo/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowRight, ClipboardCheck, Plus } from "lucide-react"
import { useToast } from "@/components/hooks/use-toast"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { PageHeader } from "@/components/layout/PageHeader"
import { SidePanel } from "@/components/layout/SidePanel"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { GET_CHECKLIST_SUBMISSIONS, GET_CHECKLIST_TEMPLATES, START_CHECKLIST_SUBMISSION } from "@/graphql/checklist"
import { ChecklistSubmission, ChecklistSubmissionStatus, ChecklistTemplate } from "@/interfaces/checklist"
import { ChecklistProgress } from "@/components/checklists/ChecklistProgress"
import { checklistStatus, submissionProgress } from "@/lib/checklist-items"
import { formatDateTime } from "@/lib/format"
import { useTranslation } from "react-i18next"
import { canOpenPage } from "@/lib/proxy-rules"

const HISTORY_PREVIEW = 6

const byMostRecent = (a: ChecklistSubmission, b: ChecklistSubmission) =>
  new Date(b.completed_at ?? b.started_at).getTime() - new Date(a.completed_at ?? a.started_at).getTime()

// One card anatomy for every checklist: title, status, facts, action bottom right.
function SubmissionCard({ submission }: { submission: ChecklistSubmission }) {
  const { t } = useTranslation("checklists")
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
              {t("list.card.itemsChecked", { count: total, checked, total })}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {isCompleted && submission.completed_at
              ? t("submission.completedOn", { date: formatDateTime(submission.completed_at) })
              : t("submission.startedOn", { date: formatDateTime(submission.started_at) })}
          </p>
        </CardContent>
        <CardFooter className="justify-end pt-0">
          <span className="flex items-center gap-2 text-sm font-medium text-primary">
            {inProgress ? t("list.card.resume") : t("list.card.view")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  )
}

export default function ChecklistsPage() {
  const { t } = useTranslation("checklists")
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
    templatesData?.checklistTemplates?.filter((template: ChecklistTemplate) => template.is_active) || []

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
        title: t("toast.startFailed.title"),
        description: t("toast.retryLater"),
      })
    }
  }

  const newButton = (
    <Button onClick={() => setIsNewDialogOpen(true)}>
      <Plus className="h-4 w-4" />
      {t("list.new")}
    </Button>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("list.title")}
        description={t("list.description")}
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
          title={t("list.empty.title")}
          description={t("list.empty.description")}
          action={newButton}
        />
      ) : (
        <>
          {inProgress.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">{t("list.sections.inProgress")}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inProgress.map((sub) => (
                  <SubmissionCard key={sub.id} submission={sub} />
                ))}
              </div>
            </section>
          )}

          {history.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">{t("list.sections.history")}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {visibleHistory.map((sub) => (
                  <SubmissionCard key={sub.id} submission={sub} />
                ))}
              </div>
              {history.length > HISTORY_PREVIEW && (
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => setShowAllHistory(!showAllHistory)}>
                    {showAllHistory ? t("list.showLess") : t("list.showAll", { total: history.length })}
                  </Button>
                </div>
              )}
            </section>
          )}
        </>
      )}

      <SidePanel
        open={isNewDialogOpen}
        onOpenChange={(open) => !starting && setIsNewDialogOpen(open)}
        title={t("list.start.title")}
        description={t("list.start.description")}
        onSubmit={handleStartChecklist}
        submitLabel={t("list.start.submit")}
        submitting={starting}
        submitDisabled={!templateId || !userData?.id}
        size="md"
      >
        <div className="space-y-2">
          <Label htmlFor="checklist-template">{t("list.start.templateLabel")}</Label>
          {loadingTemplates && templates.length === 0 ? (
            <Skeleton className="h-10 w-full" />
          ) : templates.length === 0 ? (
            <div className="space-y-3 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              <p>{t("list.start.noTemplate")}</p>
              {/* Administrators, instructors and technicians manage the templates. */}
              {canOpenPage(userData?.role?.role_name, "/administration/checklists") && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/administration/checklists">{t("list.start.manageTemplates")}</Link>
                </Button>
              )}
            </div>
          ) : (
            <Select value={templateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger id="checklist-template">
                <SelectValue placeholder={t("list.start.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={String(template.id)} value={String(template.id)}>
                    {template.name} — {template.aircraft_model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </SidePanel>
    </div>
  )
}
