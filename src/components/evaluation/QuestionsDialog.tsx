"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useMutation } from "@apollo/client"
import { Check, HelpCircle, Loader2, Plus, Trash2 } from "lucide-react"
import { CREATE_QUESTION, DELETE_QUESTION, UPDATE_QUESTION } from "@/graphql/learningAdmin"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/layout/EmptyState"
import { toast } from "@/components/hooks/use-toast"
import { ConfirmDeleteDialog } from "@/components/e-learning/ConfirmDeleteDialog"
import { FormField } from "@/components/e-learning/FormField"
import { RowActions } from "@/components/e-learning/RowActions"
import { cn } from "@/lib/utils"

export interface AdminQuestion {
  id: number | string
  content: { text: string; image?: string; explanation?: string }
  options: string[]
  correct_answer: string
}

export interface AdminEvaluation {
  id: number | string
  pass_score: number
  module?: { id: number | string; title: string } | null
  questions: AdminQuestion[]
}

interface QuestionForm {
  // Absent while creating a question.
  id: number | string | null
  // What an existing question holds besides its text (image, hint): kept as it is.
  content: AdminQuestion["content"] | null
  text: string
  options: string[]
  // Position of the right answer among the options, -1 while none is chosen.
  correctIndex: number
}

const emptyQuestion: QuestionForm = { id: null, content: null, text: "", options: ["", ""], correctIndex: -1 }

interface QuestionsDialogProps {
  // The evaluation whose questions are managed; the dialog is closed without it.
  evaluation: AdminEvaluation | null
  onClose: () => void
  // Called after each change so the list of evaluations is read again.
  onChanged: () => void
}

// The questions of an evaluation: the list, and the form of one question in the same dialog.
export function QuestionsDialog({ evaluation, onClose, onChanged }: QuestionsDialogProps) {
  // null shows the list; a form shows the question being written.
  const [form, setForm] = useState<QuestionForm | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<AdminQuestion | null>(null)

  const [createQuestion, { loading: creating }] = useMutation(CREATE_QUESTION)
  const [updateQuestion, { loading: updating }] = useMutation(UPDATE_QUESTION)
  const [deleteQuestion, { loading: deleting }] = useMutation(DELETE_QUESTION)
  const saving = creating || updating

  const evaluationId = evaluation?.id ?? null
  // Each evaluation opens on its list of questions.
  useEffect(() => {
    setForm(null)
    setSubmitted(false)
  }, [evaluationId])

  const questions = evaluation?.questions ?? []

  const openCreate = () => {
    setForm(emptyQuestion)
    setSubmitted(false)
  }

  const openEdit = (question: AdminQuestion) => {
    setForm({
      id: question.id,
      content: question.content ?? null,
      text: question.content?.text ?? "",
      options: question.options.length >= 2 ? [...question.options] : [...question.options, "", ""].slice(0, 2),
      correctIndex: question.options.indexOf(question.correct_answer),
    })
    setSubmitted(false)
  }

  const setOption = (index: number, value: string) =>
    setForm((previous) =>
      previous ? { ...previous, options: previous.options.map((option, i) => (i === index ? value : option)) } : previous,
    )

  const removeOption = (index: number) =>
    setForm((previous) => {
      if (!previous || previous.options.length <= 2) return previous
      const correctIndex =
        previous.correctIndex === index ? -1 : previous.correctIndex > index ? previous.correctIndex - 1 : previous.correctIndex
      return { ...previous, options: previous.options.filter((_, i) => i !== index), correctIndex }
    })

  const trimmedOptions = form ? form.options.map((option) => option.trim()) : []
  const errors = form
    ? {
        text: form.text.trim() ? null : "Écrivez la question.",
        options: trimmedOptions.some((option) => option === "")
          ? "Remplissez chaque réponse, ou supprimez celles qui sont vides."
          : new Set(trimmedOptions).size !== trimmedOptions.length
            ? "Deux réponses sont identiques : chaque réponse doit être différente."
            : form.correctIndex < 0
              ? "Cochez la bonne réponse."
              : null,
      }
    : { text: null, options: null }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form || evaluationId === null) return
    setSubmitted(true)
    if (errors.text || errors.options) return

    const input = {
      content: { ...(form.content ?? {}), text: form.text.trim() },
      options: trimmedOptions,
      correct_answer: trimmedOptions[form.correctIndex],
    }

    try {
      if (form.id !== null) {
        await updateQuestion({ variables: { id: Number(form.id), updateQuestionInput: input } })
        toast({ title: "Question modifiée", description: "Les changements ont été enregistrés." })
      } else {
        await createQuestion({ variables: { evaluationId: Number(evaluationId), createQuestionInput: input } })
        toast({ title: "Question ajoutée", description: "Elle fait maintenant partie de l'évaluation." })
      }
      onChanged()
      setForm(null)
    } catch {
      toast({
        title: form.id !== null ? "Question non modifiée" : "Question non ajoutée",
        description: "L'enregistrement a échoué. Vérifiez la question puis réessayez.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!questionToDelete) return
    try {
      await deleteQuestion({ variables: { id: Number(questionToDelete.id) } })
      setQuestionToDelete(null)
      onChanged()
      toast({ title: "Question supprimée", description: "Elle a été retirée de l'évaluation." })
    } catch {
      toast({
        title: "Question non supprimée",
        description: "La suppression a échoué. Réessayez dans un instant.",
        variant: "destructive",
      })
    }
  }

  const moduleTitle = evaluation?.module?.title ?? "Évaluation"

  return (
    <>
      <Dialog open={evaluation !== null} onOpenChange={(open) => !open && !saving && onClose()}>
        <DialogContent className="max-w-2xl">
          {form === null ? (
            <>
              <DialogHeader>
                <DialogTitle>Questions de l'évaluation</DialogTitle>
                <DialogDescription>
                  {moduleTitle} · score de réussite : {Math.round(evaluation?.pass_score ?? 0)} % · {questions.length}{" "}
                  question{questions.length > 1 ? "s" : ""}
                </DialogDescription>
              </DialogHeader>

              {questions.length === 0 ? (
                <EmptyState
                  icon={HelpCircle}
                  title="Aucune question"
                  description="Tant qu'elle n'a pas de question, l'évaluation ne peut pas être passée."
                />
              ) : (
                <ol className="space-y-3">
                  {questions.map((question, index) => (
                    <li key={question.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium">
                          <span className="tabular-nums text-muted-foreground">{index + 1}. </span>
                          {question.content?.text}
                        </p>
                        <RowActions
                          name={`la question ${index + 1}`}
                          onEdit={() => openEdit(question)}
                          onDelete={() => setQuestionToDelete(question)}
                        />
                      </div>
                      <ul className="mt-2 space-y-1">
                        {question.options.map((option, optionIndex) => {
                          const isCorrect = option === question.correct_answer
                          return (
                            <li
                              key={optionIndex}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1 text-sm",
                                isCorrect ? "bg-success/15 font-medium text-success" : "text-muted-foreground",
                              )}
                            >
                              {isCorrect ? (
                                <Check className="h-4 w-4 shrink-0" aria-label="Bonne réponse" />
                              ) : (
                                <span className="w-4 shrink-0" aria-hidden="true" />
                              )}
                              {option}
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={onClose}>
                  Fermer
                </Button>
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Ajouter une question
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{form.id !== null ? "Modifier la question" : "Ajouter une question"}</DialogTitle>
                <DialogDescription>{moduleTitle} · une seule bonne réponse par question.</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <FormField label="Question" htmlFor="question-text" required error={submitted ? errors.text : null}>
                  <Textarea
                    id="question-text"
                    value={form.text}
                    onChange={(event) => setForm({ ...form, text: event.target.value })}
                    placeholder="Ex. Que signifie le groupe « CAVOK » dans un METAR ?"
                    rows={3}
                    aria-invalid={submitted && !!errors.text}
                  />
                </FormField>

                <FormField
                  label="Réponses proposées"
                  required
                  error={submitted ? errors.options : null}
                  hint="Cochez le rond de la bonne réponse. Deux réponses au minimum."
                >
                  <div className="space-y-2" role="radiogroup" aria-label="Bonne réponse">
                    {form.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct-answer"
                          className="h-4 w-4 shrink-0 accent-primary"
                          checked={form.correctIndex === index}
                          onChange={() => setForm({ ...form, correctIndex: index })}
                          aria-label={`La réponse ${index + 1} est la bonne`}
                        />
                        <Input
                          value={option}
                          onChange={(event) => setOption(index, event.target.value)}
                          placeholder={`Réponse ${index + 1}`}
                          aria-label={`Réponse ${index + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => removeOption(index)}
                          disabled={form.options.length <= 2}
                          aria-label={`Supprimer la réponse ${index + 1}`}
                          title={form.options.length <= 2 ? "Deux réponses au minimum" : "Supprimer la réponse"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm({ ...form, options: [...form.options, ""] })}
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter une réponse
                  </Button>
                </FormField>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setForm(null)} disabled={saving}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {form.id !== null ? "Enregistrer" : "Ajouter la question"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={questionToDelete !== null}
        onOpenChange={(open) => !open && setQuestionToDelete(null)}
        title="Supprimer cette question ?"
        description={`La question « ${questionToDelete?.content?.text ?? ""} » sera définitivement supprimée de l'évaluation.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
