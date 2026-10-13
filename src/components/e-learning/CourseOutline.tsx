"use client"

import Link from "next/link"
import { CheckCircle2, ChevronRight, Circle, ClipboardCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Course, Module } from "@/interfaces/learning"
import { learningRoutes } from "@/lib/learning-navigation"
import type { EvaluationAttempt } from "@/lib/learning-progress"

interface CourseOutlineProps {
  course: Course
  completedLessonIds: ReadonlySet<number>
  // The lesson the "Continuer" button opens.
  resumeLessonId: number | null
  latestAttempts: ReadonlyMap<number, EvaluationAttempt>
}

function EvaluationRow({
  evaluation,
  label,
  attempt,
}: {
  evaluation: Module["evaluations"][number]
  label: string
  attempt: EvaluationAttempt | undefined
}) {
  const { t } = useTranslation("instruction")
  const passed = attempt?.passed === true
  const required = t("shared.percent", { value: Math.round(evaluation.pass_score) })
  return (
    <li className="flex flex-wrap items-center gap-3 px-2 py-3">
      <ClipboardCheck className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          {attempt && attempt.score !== null
            ? t("eLearning.outline.requiredAndYourScore", {
                required,
                score: t("shared.percent", { value: Math.round(attempt.score) }),
              })
            : t("shared.requiredScore", { score: required })}
        </p>
      </div>
      {passed ? (
        <Badge variant="success">{t("shared.passed")}</Badge>
      ) : attempt ? (
        <Badge variant="danger">{t("shared.failed")}</Badge>
      ) : (
        <Badge variant="neutral">{t("shared.toTake")}</Badge>
      )}
      <Button variant="outline" size="sm" asChild>
        {passed ? (
          <Link href={learningRoutes.evaluations}>{t("shared.myResults")}</Link>
        ) : (
          <Link href={learningRoutes.evaluation(evaluation.id)}>{attempt ? t("shared.retake") : t("shared.take")}</Link>
        )}
      </Button>
    </li>
  )
}

// The programme of a course: its modules, their lessons and their evaluations.
export function CourseOutline({ course, completedLessonIds, resumeLessonId, latestAttempts }: CourseOutlineProps) {
  const { t } = useTranslation("instruction")
  // Opens on the module to resume, so the next lesson is one click away.
  const resumeModule =
    course.modules.find((module) => module.lessons.some((lesson) => Number(lesson.id) === resumeLessonId)) ??
    course.modules[0]

  return (
    <Accordion type="multiple" defaultValue={resumeModule ? [String(resumeModule.id)] : []} className="space-y-3">
      {course.modules.map((module, moduleIndex) => {
        const done = module.lessons.filter((lesson) => completedLessonIds.has(Number(lesson.id))).length
        const total = module.lessons.length
        const evaluations = module.evaluations ?? []

        return (
          <AccordionItem key={module.id} value={String(module.id)} className="rounded-xl border bg-card px-4">
            <AccordionTrigger className="gap-3 text-left hover:no-underline">
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <p className="text-xs font-normal text-muted-foreground">
                    {t("eLearning.outline.module", { number: moduleIndex + 1 })}
                  </p>
                  <p className="text-base font-semibold">{module.title}</p>
                </div>
                {total > 0 && done === total ? (
                  <Badge variant="success">{t("eLearning.outline.moduleDone")}</Badge>
                ) : (
                  <span className="text-sm font-normal tabular-nums text-muted-foreground">
                    {t("eLearning.outline.lessonsRatio", { done, count: total })}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {module.description && <p className="mb-2 text-sm text-muted-foreground">{module.description}</p>}
              {total === 0 && evaluations.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">{t("eLearning.outline.noLessons")}</p>
              ) : (
                <ul className="divide-y">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const completed = completedLessonIds.has(Number(lesson.id))
                    const isNext = !completed && Number(lesson.id) === resumeLessonId
                    return (
                      <li key={lesson.id}>
                        <Link
                          href={learningRoutes.lesson(course.id, lesson.id)}
                          className="flex min-h-[3rem] items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {completed ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-label={t("eLearning.outline.lessonDoneAria")} />
                          ) : (
                            <Circle className="h-5 w-5 shrink-0 text-muted-foreground" aria-label={t("eLearning.outline.lessonTodoAria")} />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">
                              {lessonIndex + 1}. {lesson.title}
                            </p>
                            {lesson.description && (
                              <p className="line-clamp-1 text-sm text-muted-foreground">{lesson.description}</p>
                            )}
                          </div>
                          {isNext && <Badge variant="info">{t("eLearning.outline.next")}</Badge>}
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </Link>
                      </li>
                    )
                  })}
                  {evaluations.map((evaluation, evaluationIndex) => (
                    <EvaluationRow
                      key={`evaluation-${evaluation.id}`}
                      evaluation={evaluation}
                      label={
                        evaluations.length > 1
                          ? t("eLearning.outline.evaluationNumbered", { number: evaluationIndex + 1 })
                          : t("eLearning.outline.evaluationSingle")
                      }
                      attempt={latestAttempts.get(Number(evaluation.id))}
                    />
                  ))}
                </ul>
              )}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
