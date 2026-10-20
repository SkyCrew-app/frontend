"use client"

import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useQuery } from "@apollo/client"
import { CalendarDays, CalendarX, List, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import CourseList from "@/components/courses/CourseList"
import CourseCalendar from "@/components/courses/CourseCalendar"
import CourseFormDialog from "@/components/courses/CourseFormDialog"
import { ListPagination, paginate } from "@/components/courses/ListPagination"
import {
  courseCounterpart,
  courseStatusOptions,
  personName,
  type InstructionCourse,
} from "@/components/courses/course-helpers"
import { GET_COURSE_BY_USER_ID } from "@/graphql/course"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { isAdministrator, isInstructor as hasInstructorRole } from "@/lib/roles"

const PAGE_SIZE = 10

export default function InstructionDashboard() {
  const { t } = useTranslation("instruction")
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [isNewCourseOpen, setIsNewCourseOpen] = useState(false)

  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const userId: number | null = userData ? Number(userData.id) : null

  const isInstructor = hasInstructorRole(userData)
  const isAdmin = isAdministrator(userData)
  // Only an instructor or an administrator can plan a course.
  const canCreateCourse = isInstructor || isAdmin

  const { loading, error, data, refetch } = useQuery<{ getCoursesByUserId: InstructionCourse[] }>(
    GET_COURSE_BY_USER_ID,
    {
      variables: { userId },
      skip: userId === null,
    },
  )

  const courses = data?.getCoursesByUserId
  const filteredCourses = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    return (courses ?? [])
      .filter((course) => {
        const matchesSearch =
          !search ||
          personName(course.instructor).toLowerCase().includes(search) ||
          personName(course.student).toLowerCase().includes(search)
        const matchesStatus = statusFilter === "all" || course.status === statusFilter
        return matchesSearch && matchesStatus
      })
      // The most recent and the coming courses first.
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  }, [courses, searchTerm, statusFilter])

  const isFiltered = searchTerm.trim() !== "" || statusFilter !== "all"
  const { rows, pageCount, page: currentPage } = paginate(filteredCourses, page, PAGE_SIZE)
  // Hint for the search field: the people the user has courses with.
  const searchExample = courses?.[0] ? personName(courseCounterpart(courses[0], userId).person) : "Martin"

  const description = isInstructor
    ? t("courses.page.description.instructor")
    : isAdmin
      ? t("courses.page.description.admin")
      : t("courses.page.description.student")

  const planButton = canCreateCourse ? (
    <Button onClick={() => setIsNewCourseOpen(true)}>
      <Plus className="h-4 w-4" />
      {t("courses.page.plan")}
    </Button>
  ) : null

  return (
    <div className="space-y-6">
      <PageHeader className="mb-0" title={t("courses.title")} description={description} actions={planButton} />

      {/* One Tabs root around the toolbar and the content: the view switch controls the panel below it. */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "list" | "calendar")} className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:min-w-[12rem] sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label={t("courses.page.searchAria")}
              placeholder={t("courses.page.searchPlaceholder", { name: searchExample })}
              className="pl-9"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label={t("courses.page.filterStatusAria")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("courses.page.allStatuses")}</SelectItem>
              {courseStatusOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TabsList aria-label={t("courses.page.viewAria")} className="shrink-0 self-start sm:ml-auto sm:self-auto">
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              {t("courses.page.viewList")}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              {t("courses.page.viewCalendar")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={viewMode} className="mt-0">
          {userId === null || (loading && !data) ? (
            <div className="space-y-2 rounded-xl border bg-card p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : error && !data ? (
            <ErrorState onRetry={() => refetch()} />
          ) : filteredCourses.length === 0 ? (
            <EmptyState
              icon={CalendarX}
              title={isFiltered ? t("courses.page.empty.filteredTitle") : t("courses.page.empty.title")}
              description={
                isFiltered
                  ? t("courses.page.empty.filteredDescription")
                  : canCreateCourse
                    ? t("courses.page.empty.planDescription")
                    : t("courses.page.empty.studentDescription")
              }
              action={
                isFiltered ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setStatusFilter("all")
                    }}
                  >
                    {t("common:actions.clearFilters")}
                  </Button>
                ) : (
                  planButton
                )
              }
            />
          ) : viewMode === "list" ? (
            <>
              <CourseList courses={rows} userId={userId} isAdministrator={isAdmin} onChanged={() => refetch()} />
              <ListPagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
            </>
          ) : (
            <CourseCalendar courses={filteredCourses} userId={userId} />
          )}
        </TabsContent>
      </Tabs>

      <CourseFormDialog
        open={isNewCourseOpen}
        onClose={() => setIsNewCourseOpen(false)}
        instructorId={isInstructor ? userId : null}
        onSaved={() => refetch()}
      />
    </div>
  )
}
