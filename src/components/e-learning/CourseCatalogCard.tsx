"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import i18n from "@/lib/i18n"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { learningRoutes } from "@/lib/learning-navigation"
import { percentage } from "@/lib/learning-progress"

export interface CatalogCourse {
  id: number | string
  title: string
  description?: string | null
  category?: string | null
  required_license?: string | null
}

export interface CourseProgress {
  completedLessons: number
  totalLessons: number
}

type BadgeVariant = "success" | "info" | "neutral"

// Where the member stands in a course, the same wording on every screen.
export function courseProgressStatus(progress: CourseProgress): {
  label: string
  variant: BadgeVariant
  action: string
} {
  const done = percentage(progress.completedLessons, progress.totalLessons)
  if (done >= 100) {
    return {
      label: i18n.t("instruction:eLearning.progress.done"),
      variant: "success",
      action: i18n.t("instruction:eLearning.progress.review"),
    }
  }
  if (done > 0) {
    return {
      label: i18n.t("instruction:eLearning.progress.inProgress"),
      variant: "info",
      action: i18n.t("common:actions.continue"),
    }
  }
  return {
    label: i18n.t("instruction:eLearning.progress.notStarted"),
    variant: "neutral",
    action: i18n.t("instruction:eLearning.progress.start"),
  }
}

interface CourseCatalogCardProps {
  course: CatalogCourse
  // Unknown while the progress has not been loaded, or could not be.
  progress?: CourseProgress
}

// One course of the catalogue: the whole card opens the course.
export function CourseCatalogCard({ course, progress }: CourseCatalogCardProps) {
  const { t } = useTranslation("instruction")
  const status = progress && progress.totalLessons > 0 ? courseProgressStatus(progress) : null
  const done = progress ? percentage(progress.completedLessons, progress.totalLessons) : 0
  const facts = [course.category, course.required_license ? t("eLearning.card.licence", { licence: course.required_license }) : null].filter(Boolean)

  return (
    <Link
      href={learningRoutes.eLearningCourse(course.id)}
      className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="flex h-full flex-col transition-shadow group-hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base leading-snug">{course.title}</CardTitle>
            {status && (
              <Badge variant={status.variant} className="shrink-0">
                {status.label}
              </Badge>
            )}
          </div>
          {facts.length > 0 && <p className="text-xs text-muted-foreground">{facts.join(" · ")}</p>}
        </CardHeader>
        <CardContent className="flex-1 space-y-4 pb-4">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {course.description || t("eLearning.card.noDescription")}
          </p>
          {progress && progress.totalLessons > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {t("shared.lessonsRatio", { done: progress.completedLessons, total: progress.totalLessons })}
                </span>
                <span className="tabular-nums">{t("shared.percent", { value: done })}</span>
              </div>
              <Progress value={done} className="h-2" aria-label={t("shared.progressAria", { percent: done })} />
            </div>
          )}
          {progress && progress.totalLessons === 0 && (
            <p className="text-xs text-muted-foreground">{t("eLearning.card.noLessons")}</p>
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            {status?.action ?? t("eLearning.card.open")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  )
}
