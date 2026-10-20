"use client"

import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import Link from "next/link"
import { useQuery } from "@apollo/client"
import { BookOpen, Search, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import {
  CourseCatalogCard,
  type CatalogCourse,
  type CourseProgress,
} from "@/components/e-learning/CourseCatalogCard"
import { GET_USER_INSTRUCTION_SUMMARY } from "@/graphql/evaluation"
import { GET_COURSES } from "@/graphql/learningAdmin"
import type { InstructionSummary } from "@/interfaces/instruction"
import { currentLocale } from "@/lib/i18n"
import { percentage } from "@/lib/learning-progress"
import { isAdministrator } from "@/lib/roles"

// Courses to resume first, then the ones to start, then the finished ones.
const progressRank = (progress: CourseProgress | undefined) => {
  if (!progress) return 1
  const done = percentage(progress.completedLessons, progress.totalLessons)
  if (done > 0 && done < 100) return 0
  return done >= 100 ? 2 : 1
}

export default function ELearningPage() {
  const { t } = useTranslation("instruction")
  const [searchTerm, setSearchTerm] = useState("")
  const [category, setCategory] = useState("all")
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const userId: number | null = userData ? Number(userData.id) : null

  const { data, loading, error, refetch } = useQuery<{ getCourses: CatalogCourse[] }>(GET_COURSES, {
    fetchPolicy: "cache-and-network",
  })
  // The summary carries the lessons completed in each course.
  const { data: summaryData } = useQuery<{ getUserInstructionSummary: InstructionSummary }>(
    GET_USER_INSTRUCTION_SUMMARY,
    {
      variables: { userId },
      skip: userId === null,
      fetchPolicy: "cache-and-network",
    },
  )

  const courses = data?.getCourses
  const progressByCourse = useMemo(() => {
    const map = new Map<number, CourseProgress>()
    for (const course of summaryData?.getUserInstructionSummary.eLearningCourses ?? []) {
      map.set(Number(course.id), { completedLessons: course.completedLessons, totalLessons: course.totalLessons })
    }
    return map
  }, [summaryData])

  const categories = useMemo(
    () =>
      [...new Set((courses ?? []).map((course) => course.category?.trim()).filter((name): name is string => !!name))].sort(
        (a, b) => a.localeCompare(b, currentLocale()),
      ),
    [courses],
  )

  const visibleCourses = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    return (courses ?? [])
      .filter((course) => {
        const matchesSearch =
          !search ||
          course.title.toLowerCase().includes(search) ||
          (course.description ?? "").toLowerCase().includes(search)
        const matchesCategory = category === "all" || course.category?.trim() === category
        return matchesSearch && matchesCategory
      })
      .sort(
        (a, b) =>
          progressRank(progressByCourse.get(Number(a.id))) - progressRank(progressByCourse.get(Number(b.id))) ||
          a.title.localeCompare(b.title, currentLocale()),
      )
  }, [courses, searchTerm, category, progressByCourse])

  const isFiltered = searchTerm.trim() !== "" || category !== "all"
  const manageButton = isAdministrator(userData) ? (
    <Button variant="outline" asChild>
      <Link href="/administration/e-learning">
        <Settings className="h-4 w-4" />
        {t("eLearning.catalogue.manage")}
      </Link>
    </Button>
  ) : null

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={t("eLearning.title")}
        description={t("eLearning.catalogue.description")}
        actions={manageButton}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t("eLearning.catalogue.searchAria")}
            placeholder={t("eLearning.catalogue.searchPlaceholder")}
            className="pl-9"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        {categories.length > 1 && (
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-56 sm:shrink-0" aria-label={t("eLearning.catalogue.filterCategoryAria")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("eLearning.catalogue.allCategories")}</SelectItem>
              {categories.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading && !courses ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error && !courses ? (
        <ErrorState onRetry={() => refetch()} />
      ) : visibleCourses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={isFiltered ? t("eLearning.catalogue.empty.filteredTitle") : t("eLearning.catalogue.empty.title")}
          description={
            isFiltered
              ? t("eLearning.catalogue.empty.filteredDescription")
              : t("eLearning.catalogue.empty.description")
          }
          action={
            isFiltered ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setCategory("all")
                }}
              >
                {t("common:actions.clearFilters")}
              </Button>
            ) : (
              manageButton
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {visibleCourses.map((course) => (
            <CourseCatalogCard key={course.id} course={course} progress={progressByCourse.get(Number(course.id))} />
          ))}
        </div>
      )}
    </div>
  )
}
