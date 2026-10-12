"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@apollo/client"
import { CalendarDays, CalendarX, List, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import CourseList from "@/components/courses/CourseList"
import CourseCalendar from "@/components/courses/CourseCalendar"
import CourseFormDialog from "@/components/courses/CourseFormDialog"
import { ListPagination, paginate } from "@/components/courses/ListPagination"
import {
  COURSE_STATUS_OPTIONS,
  courseCounterpart,
  personName,
  type InstructionCourse,
} from "@/components/courses/course-helpers"
import { GET_COURSE_BY_USER_ID } from "@/graphql/course"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { isAdministrator, isInstructor as hasInstructorRole } from "@/lib/roles"

const PAGE_SIZE = 10

export default function InstructionDashboard() {
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
    ? "Les cours que vous donnez à vos élèves, et ceux que vous suivez."
    : isAdmin
      ? "Les cours auxquels vous participez. Vous pouvez en planifier pour un instructeur."
      : "Vos cours avec vos instructeurs : dates, compétences travaillées et notes."

  const planButton = canCreateCourse ? (
    <Button onClick={() => setIsNewCourseOpen(true)}>
      <Plus className="h-4 w-4" />
      Planifier un cours
    </Button>
  ) : null

  return (
    <div className="space-y-6">
      <PageHeader className="mb-0" title="Mes cours" description={description} actions={planButton} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Rechercher un cours par personne"
            placeholder={`Rechercher une personne, ex. ${searchExample}`}
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
          <SelectTrigger className="w-full sm:w-44" aria-label="Filtrer par statut">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {COURSE_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tabs
          value={viewMode}
          onValueChange={(value) => setViewMode(value as "list" | "calendar")}
          className="sm:ml-auto"
        >
          <TabsList aria-label="Affichage des cours">
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              Liste
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Calendrier
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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
          title={isFiltered ? "Aucun cours ne correspond" : "Aucun cours pour le moment"}
          description={
            isFiltered
              ? "Modifiez la recherche ou le filtre de statut."
              : canCreateCourse
                ? "Planifiez un premier cours avec un élève."
                : "Vos cours apparaîtront ici dès qu'un instructeur en aura planifié un avec vous."
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
                Effacer les filtres
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

      <CourseFormDialog
        open={isNewCourseOpen}
        onClose={() => setIsNewCourseOpen(false)}
        instructorId={isInstructor ? userId : null}
        onSaved={() => refetch()}
      />
    </div>
  )
}
