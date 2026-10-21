"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery } from "@apollo/client"
import { ClipboardList, HelpCircle, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react"
import {
  CREATE_EVALUATION,
  DELETE_EVALUATION,
  GET_EVALUATIONS,
  GET_MODULES,
  UPDATE_EVALUATION,
} from "@/graphql/learningAdmin"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { SidePanel } from "@/components/layout/SidePanel"
import { toast } from "@/components/hooks/use-toast"
import { ConfirmDeleteDialog } from "@/components/e-learning/ConfirmDeleteDialog"
import { FormField } from "@/components/e-learning/FormField"
import { QuestionsDialog, type AdminEvaluation } from "./QuestionsDialog"

interface ModuleOption {
  id: number | string
  title: string
}

interface EvaluationForm {
  // Absent while creating an evaluation.
  id: number | string | null
  moduleId: string
  moduleTitle: string
  passScore: string
}

const emptyForm: EvaluationForm = { id: null, moduleId: "", moduleTitle: "", passScore: "70" }

export function EvaluationManagement() {
  const { t } = useTranslation("instruction")
  const [searchTerm, setSearchTerm] = useState("")
  const [form, setForm] = useState<EvaluationForm>(emptyForm)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [questionsOf, setQuestionsOf] = useState<string | null>(null)
  const [evaluationToDelete, setEvaluationToDelete] = useState<AdminEvaluation | null>(null)

  const modulesQuery = useQuery<{ getAllModules: ModuleOption[] }>(GET_MODULES, { fetchPolicy: "cache-and-network" })
  const { data, loading, error, refetch } = useQuery<{ getEvaluations: AdminEvaluation[] }>(GET_EVALUATIONS, {
    fetchPolicy: "cache-and-network",
  })

  const [createEvaluation, { loading: creating }] = useMutation(CREATE_EVALUATION)
  const [updateEvaluation, { loading: updating }] = useMutation(UPDATE_EVALUATION)
  const [deleteEvaluation, { loading: deleting }] = useMutation(DELETE_EVALUATION)
  const saving = creating || updating
  const isEdit = form.id !== null

  const evaluations = data?.getEvaluations
  const modules = modulesQuery.data?.getAllModules ?? []
  // Read from the list, so the dialog follows each change of its questions.
  const openedEvaluation = (evaluations ?? []).find((evaluation) => String(evaluation.id) === questionsOf) ?? null

  const openCreate = () => {
    setForm(emptyForm)
    setSubmitted(false)
    setIsFormOpen(true)
  }

  const openEdit = (evaluation: AdminEvaluation) => {
    setForm({
      id: evaluation.id,
      moduleId: evaluation.module ? String(evaluation.module.id) : "",
      moduleTitle: evaluation.module?.title ?? "—",
      passScore: String(Math.round(evaluation.pass_score)),
    })
    setSubmitted(false)
    setIsFormOpen(true)
  }

  const passScore = Number.parseInt(form.passScore, 10)
  const errors = {
    moduleId: isEdit || form.moduleId ? null : t("admin.evaluations.form.moduleError"),
    passScore:
      Number.isInteger(passScore) && passScore >= 1 && passScore <= 100
        ? null
        : t("admin.evaluations.form.passScoreError"),
  }

  const handleSubmit = async () => {
    setSubmitted(true)
    if (errors.moduleId || errors.passScore) return

    try {
      if (form.id !== null) {
        await updateEvaluation({
          variables: { id: Number(form.id), updateEvaluationInput: { pass_score: passScore } },
        })
        await refetch()
        toast({
          title: t("admin.evaluations.toast.updated.title"),
          description: t("admin.evaluations.toast.updated.description"),
        })
        setIsFormOpen(false)
      } else {
        const { data: created } = await createEvaluation({
          variables: {
            createEvaluationInput: { moduleId: Number.parseInt(form.moduleId, 10), pass_score: passScore },
          },
        })
        await refetch()
        toast({
          title: t("admin.evaluations.toast.created.title"),
          description: t("admin.evaluations.toast.created.description"),
        })
        setIsFormOpen(false)
        // A new evaluation is empty: go straight to its questions.
        if (created?.createEvaluation?.id != null) setQuestionsOf(String(created.createEvaluation.id))
      }
    } catch {
      toast({
        title: isEdit
          ? t("admin.evaluations.toast.updateFailed.title")
          : t("admin.evaluations.toast.createFailed.title"),
        description: t("shared.saveFailed"),
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!evaluationToDelete) return
    try {
      await deleteEvaluation({ variables: { id: Number(evaluationToDelete.id) } })
      setEvaluationToDelete(null)
      refetch()
      toast({
        title: t("admin.evaluations.toast.deleted.title"),
        description: t("admin.evaluations.toast.deleted.description"),
      })
    } catch {
      toast({
        title: t("admin.evaluations.toast.deleteFailed.title"),
        description: t("shared.deleteFailed"),
        variant: "destructive",
      })
    }
  }

  const search = searchTerm.trim().toLowerCase()
  const filteredEvaluations = (evaluations ?? []).filter(
    (evaluation) => !search || (evaluation.module?.title ?? "").toLowerCase().includes(search),
  )

  const createButton = (
    <Button onClick={openCreate}>
      <Plus className="h-4 w-4" />
      {t("admin.evaluations.create")}
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t("admin.evaluations.searchAria")}
            placeholder={t("admin.evaluations.searchPlaceholder")}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="sm:ml-auto">{createButton}</div>
      </div>

      {loading && !evaluations ? (
        <div className="space-y-2 rounded-xl border bg-card p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : error && !evaluations ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filteredEvaluations.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={search ? t("admin.evaluations.empty.filteredTitle") : t("admin.evaluations.empty.title")}
          description={
            search ? t("admin.shared.changeSearch") : t("admin.evaluations.empty.description")
          }
          action={
            search ? (
              <Button variant="outline" onClick={() => setSearchTerm("")}>
                {t("admin.shared.clearSearch")}
              </Button>
            ) : (
              createButton
            )
          }
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.evaluations.columns.module")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">{t("admin.evaluations.columns.passScore")}</TableHead>
                <TableHead className="text-right">{t("admin.evaluations.columns.questions")}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{t("common:labels.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvaluations.map((evaluation) => {
                const openQuestions = () => setQuestionsOf(String(evaluation.id))
                return (
                  <TableRow key={evaluation.id} className="cursor-pointer" onClick={openQuestions}>
                    <TableCell className="font-medium">
                      {/* The button keeps the row reachable from the keyboard. */}
                      <button
                        type="button"
                        className="text-left hover:underline focus-visible:underline focus-visible:outline-none"
                        onClick={(event) => {
                          event.stopPropagation()
                          openQuestions()
                        }}
                      >
                        {evaluation.module?.title ?? "—"}
                      </button>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {t("shared.percent", { value: Math.round(evaluation.pass_score) })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {evaluation.questions.length === 0 ? (
                        <Badge variant="warning">{t("admin.evaluations.noQuestion")}</Badge>
                      ) : (
                        evaluation.questions.length
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            aria-label={t("admin.evaluations.actionsAria", { module: evaluation.module?.title ?? "" })}
                            title={t("common:labels.actions")}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={openQuestions}>
                            <HelpCircle className="h-4 w-4" />
                            {t("admin.evaluations.manageQuestions")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openEdit(evaluation)}>
                            <Pencil className="h-4 w-4" />
                            {t("admin.evaluations.editPassScore")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setEvaluationToDelete(evaluation)}
                          >
                            <Trash2 className="h-4 w-4" />
                            {t("common:actions.delete")}
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
      )}

      <SidePanel
        open={isFormOpen}
        onOpenChange={(open) => !saving && setIsFormOpen(open)}
        title={isEdit ? t("admin.evaluations.form.editTitle") : t("admin.evaluations.create")}
        description={
          isEdit
            ? t("admin.evaluations.form.editDescription", { module: form.moduleTitle })
            : t("admin.evaluations.form.createDescription")
        }
        onSubmit={handleSubmit}
        submitLabel={isEdit ? t("common:actions.save") : t("admin.evaluations.form.submitCreate")}
        submitting={saving}
        size="md"
      >
        <div className="space-y-4">
          {!isEdit && (
            <FormField
              label={t("admin.shared.module")}
              htmlFor="evaluation-module"
              required
              error={submitted ? errors.moduleId : null}
            >
              <Select value={form.moduleId} onValueChange={(value) => setForm({ ...form, moduleId: value })}>
                <SelectTrigger id="evaluation-module">
                  <SelectValue placeholder={t("admin.shared.chooseModule")} />
                </SelectTrigger>
                <SelectContent>
                  {modulesQuery.loading && modules.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("admin.evaluations.form.loadingModules")}
                    </div>
                  ) : modules.length === 0 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      {t("admin.evaluations.form.noModules")}
                    </div>
                  ) : (
                    modules.map((module) => (
                      <SelectItem key={module.id} value={String(module.id)}>
                        {module.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FormField>
          )}

          <FormField
            label={t("admin.evaluations.columns.passScore")}
            htmlFor="evaluation-pass-score"
            required
            error={submitted ? errors.passScore : null}
            hint={t("admin.evaluations.form.passScoreHint")}
          >
            <div className="flex items-center gap-2">
              <Input
                id="evaluation-pass-score"
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                step={1}
                className="w-28 text-right tabular-nums"
                value={form.passScore}
                onChange={(event) => setForm({ ...form, passScore: event.target.value })}
                aria-invalid={submitted && !!errors.passScore}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </FormField>
        </div>
      </SidePanel>

      <QuestionsDialog evaluation={openedEvaluation} onClose={() => setQuestionsOf(null)} onChanged={() => refetch()} />

      <ConfirmDeleteDialog
        open={evaluationToDelete !== null}
        onOpenChange={(open) => !open && setEvaluationToDelete(null)}
        title={t("admin.evaluations.deleteConfirm.title")}
        description={t("admin.evaluations.deleteConfirm.description", {
          module: evaluationToDelete?.module?.title ?? "",
        })}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
