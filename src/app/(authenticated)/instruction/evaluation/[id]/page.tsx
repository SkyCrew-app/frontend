"use client"

import { useState, use } from "react"
import { useTranslation } from "react-i18next"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "@apollo/client"
import confetti from "canvas-confetti"
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, ClipboardList, HelpCircle, Loader2 } from "lucide-react"
import { GET_EVALUATION_BY_ID, VALIDATE_ANSWERS } from "@/graphql/evaluation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { QuestionStepper } from "@/components/evaluation/QuestionStepper"
import { EvaluationResult } from "@/components/evaluation/EvaluationResult"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { useToast } from "@/components/hooks/use-toast"
import type { Evaluation } from "@/interfaces/evaluation"
import { learningRoutes } from "@/lib/learning-navigation"
import { cn } from "@/lib/utils"

export default function EvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useTranslation("instruction")
  const resolvedParams = use(params)
  const evaluationId = Number.parseFloat(resolvedParams.id)
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({})
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [showMissing, setShowMissing] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const userId: number | null = userData ? Number(userData.id) : null

  const { data, loading, error, refetch } = useQuery<{ getEvaluationById: Evaluation | null }>(GET_EVALUATION_BY_ID, {
    variables: { id: evaluationId },
  })

  // The pages that list the results ask the API again each time they are opened.
  const [validateAnswers, { loading: validating }] = useMutation(VALIDATE_ANSWERS)

  const evaluation = data?.getEvaluationById ?? null
  const questions = evaluation?.questions ?? []
  const answered = questions.map((question) => question.id.toString() in userAnswers)
  const missing = answered.flatMap((isAnswered, index) => (isAnswered ? [] : [index]))
  const question = questions[currentQuestion]
  const isLastQuestion = currentQuestion === questions.length - 1

  const goToQuestion = (index: number) => {
    setCurrentQuestion(Math.min(Math.max(0, index), questions.length - 1))
  }

  const handleAnswerChange = (questionId: number, answer: string) => {
    setUserAnswers((previous) => ({ ...previous, [questionId.toString()]: answer }))
  }

  // Sending is only offered once every question has an answer.
  const handleFinish = () => {
    if (missing.length > 0) {
      setShowMissing(true)
      return
    }
    setIsConfirmOpen(true)
  }

  const handleSubmit = async () => {
    // `userId` is required by the API: wait until the member is known.
    if (userId === null || missing.length > 0) return

    try {
      const { data: validation } = await validateAnswers({
        variables: {
          evaluationId,
          userId,
          userAnswers: Object.entries(userAnswers).map(([questionId, answer]) => ({
            questionId: Number.parseFloat(questionId),
            answer,
          })),
        },
      })
      setIsConfirmOpen(false)
      setResult(validation.validateAnswers)
      if (validation.validateAnswers.passed) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      }
    } catch {
      // The answers stay in place so the member can send them again.
      setIsConfirmOpen(false)
      toast({
        title: t("evaluations.take.toast.failed.title"),
        description: t("evaluations.take.toast.failed.description"),
        variant: "destructive",
      })
    }
  }

  const handleRetry = () => {
    setUserAnswers({})
    setResult(null)
    setCurrentQuestion(0)
    setShowMissing(false)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-3 mb-2 text-muted-foreground">
          <Link href={learningRoutes.evaluations}>
            <ArrowLeft className="h-4 w-4" />
            {t("evaluations.title")}
          </Link>
        </Button>
        <PageHeader
          className="mb-0"
          title={
            evaluation
              ? t("evaluations.take.title", { module: evaluation.module.title })
              : t("shared.evaluationFallback")
          }
          description={
            evaluation
              ? t("evaluations.take.description", {
                  score: t("shared.percent", { value: Math.round(evaluation.pass_score) }),
                  count: questions.length,
                })
              : undefined
          }
        />
      </div>

      {loading && !evaluation ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-9" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : !evaluation ? (
        <ErrorState
          title={t("evaluations.take.notFound.title")}
          description={
            error
              ? t("evaluations.take.notFound.error")
              : t("evaluations.take.notFound.missing")
          }
          onRetry={() => refetch()}
        />
      ) : questions.length === 0 || !question ? (
        <EmptyState
          icon={ClipboardList}
          title={t("evaluations.take.noQuestions.title")}
          description={t("evaluations.take.noQuestions.description")}
          action={
            <Button variant="outline" asChild>
              <Link href={learningRoutes.evaluations}>{t("evaluations.take.noQuestions.back")}</Link>
            </Button>
          }
        />
      ) : result ? (
        <EvaluationResult
          score={result.score}
          passed={result.passed}
          passScore={evaluation.pass_score}
          onRetry={handleRetry}
          onContinue={() => router.push(learningRoutes.evaluations)}
        />
      ) : (
        <>
          <QuestionStepper currentQuestion={currentQuestion} answered={answered} onNavigate={goToQuestion} />

          <Card>
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="space-y-1">
                <p className="text-xs tabular-nums text-muted-foreground">
                  {t("evaluations.take.position", { number: currentQuestion + 1, total: questions.length })}
                </p>
                <div className="flex items-start justify-between gap-3">
                  <h2 id="question-text" className="text-lg font-semibold leading-snug">
                    {question.content.text}
                  </h2>
                  {question.content.explanation && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label={t("evaluations.take.hintAria")}>
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p className="text-xs">{question.content.explanation}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>

              {question.content.image && (
                <div className="relative h-40 w-full overflow-hidden rounded-lg bg-muted sm:h-56">
                  <Image
                    src={question.content.image}
                    alt={t("evaluations.take.imageAlt")}
                    fill
                    sizes="(max-width: 640px) 100vw, 720px"
                    className="object-contain"
                  />
                </div>
              )}

              <RadioGroup
                aria-labelledby="question-text"
                onValueChange={(value) => handleAnswerChange(question.id, value)}
                value={userAnswers[question.id] || ""}
                className="gap-2"
              >
                {question.options.map((option, index) => {
                  const optionId = `q${question.id}-option${index}`
                  const isSelected = userAnswers[question.id] === option
                  return (
                    <Label
                      key={optionId}
                      htmlFor={optionId}
                      className={cn(
                        "flex min-h-[2.75rem] cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-normal leading-snug transition-colors",
                        isSelected ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-muted/50",
                      )}
                    >
                      <RadioGroupItem value={option} id={optionId} className="shrink-0" />
                      <span>{option}</span>
                    </Label>
                  )
                })}
              </RadioGroup>
            </CardContent>
            <CardFooter className="flex flex-wrap justify-between gap-2 border-t p-5 sm:px-6">
              <Button variant="outline" onClick={() => goToQuestion(currentQuestion - 1)} disabled={currentQuestion === 0}>
                <ChevronLeft className="h-4 w-4" />
                {t("evaluations.take.previous")}
              </Button>
              {isLastQuestion ? (
                <Button onClick={handleFinish} disabled={validating || userId === null}>
                  {t("evaluations.take.finish")}
                </Button>
              ) : (
                <Button onClick={() => goToQuestion(currentQuestion + 1)}>
                  {t("evaluations.take.next")}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </CardFooter>
          </Card>

          {showMissing && missing.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {t("evaluations.take.missing.title", { count: missing.length })}
              </AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{t("evaluations.take.missing.description")}</p>
                <div className="flex flex-wrap gap-2">
                  {missing.map((index) => (
                    <Button key={index} variant="outline" size="sm" onClick={() => goToQuestion(index)}>
                      {t("evaluations.take.missing.question", { number: index + 1 })}
                    </Button>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      <AlertDialog open={isConfirmOpen} onOpenChange={(open) => !validating && setIsConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("evaluations.take.confirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("evaluations.take.confirm.description", { count: questions.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={validating}>{t("common:actions.cancel")}</AlertDialogCancel>
            <Button onClick={handleSubmit} disabled={validating}>
              {validating && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("evaluations.take.confirm.submit")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
