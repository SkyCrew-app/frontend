"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { BookOpen, ChevronRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { EmptyState } from "@/components/layout/EmptyState"
import type { ELearningCourse } from "@/interfaces/instruction"
import { learningRoutes } from "@/lib/learning-navigation"
import { percentage } from "@/lib/learning-progress"
import { SectionCard } from "./section-card"

interface ELearningProgressCardProps {
  courses: ELearningCourse[]
}

// Started courses come first: they are the ones to resume.
const resumeOrder = (course: ELearningCourse) => {
  const done = percentage(course.completedLessons, course.totalLessons)
  if (done > 0 && done < 100) return 0
  return done === 0 ? 1 : 2
}

export function ELearningProgressCard({ courses }: ELearningProgressCardProps) {
  const { t } = useTranslation("instruction")
  const shown = courses
    .filter((course) => course.totalLessons > 0)
    .sort((a, b) => resumeOrder(a) - resumeOrder(b))
    .slice(0, 4)

  return (
    <SectionCard
      title={t("home.eLearning.title")}
      description={t("home.eLearning.description")}
      href={learningRoutes.eLearning}
      linkLabel={t("home.eLearning.link")}
    >
      {shown.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t("home.eLearning.emptyTitle")}
          description={t("home.eLearning.emptyDescription")}
        />
      ) : (
        <ul className="divide-y">
          {shown.map((course) => {
            const done = percentage(course.completedLessons, course.totalLessons)
            return (
              <li key={course.id}>
                <Link
                  href={learningRoutes.eLearningCourse(course.id)}
                  className="flex min-h-[3.5rem] items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium">{course.title}</p>
                      <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {t("shared.lessonsRatio", { done: course.completedLessons, total: course.totalLessons })}
                      </p>
                    </div>
                    <Progress value={done} className="h-2" aria-label={t("shared.progressAria", { percent: done })} />
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}
