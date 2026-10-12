"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMutation, useQuery } from "@apollo/client"
import { ArrowLeft } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/layout/PageHeader"
import { ErrorState } from "@/components/layout/ErrorState"
import { useToast } from "@/components/hooks/use-toast"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { CompetenciesCard, type Competency } from "@/components/courses/CompetenciesCard"
import { CommentsCard, type CourseCommentItem } from "@/components/courses/CommentsCard"
import { RatingCard } from "@/components/courses/RatingCard"
import {
  courseCounterpart,
  courseHours,
  courseStatus,
  personInitials,
  personName,
  type CoursePerson,
} from "@/components/courses/course-helpers"
import { ADD_COMMENT, ADD_COMPETENCY, GET_COURSE_BY_ID, RATE_COURSE, VALIDATE_COMPETENCY } from "@/graphql/course"
import { formatDate } from "@/lib/format"
import { learningRoutes } from "@/lib/learning-navigation"
import { isAdministrator } from "@/lib/roles"

interface CourseDetail {
  id: number
  instructor: CoursePerson
  student: CoursePerson
  startTime: string
  endTime: string | null
  status: string
  feedback: string | null
  rating: number | null
  competencies: Competency[]
  comments: CourseCommentItem[] | null
}

function Participant({ person, role }: { person: CoursePerson; role: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
          {personInitials(person)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{personName(person)}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  )
}

function CourseSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  )
}

export default function CourseDetails() {
  const { id } = useParams()
  const courseId = Number(id)
  const { toast } = useToast()
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const userId: number | null = userData ? Number(userData.id) : null

  const { loading, error, data, refetch } = useQuery<{ getCourseInstructionById: CourseDetail | null }>(
    GET_COURSE_BY_ID,
    {
      variables: { id: courseId },
      skip: !id,
    },
  )

  const [addComment] = useMutation(ADD_COMMENT)
  const [addCompetency] = useMutation(ADD_COMPETENCY)
  const [validateCompetency] = useMutation(VALIDATE_COMPETENCY)
  const [rateCourse] = useMutation(RATE_COURSE)

  const course = data?.getCourseInstructionById ?? null

  // Runs a change of the course, then reloads it. Says in plain words what failed.
  const save = async (action: () => Promise<unknown>, success: string, failure: string): Promise<boolean> => {
    try {
      await action()
      await refetch()
      toast({ title: success })
      return true
    } catch {
      toast({ variant: "destructive", title: failure, description: "Réessayez dans un instant." })
      return false
    }
  }

  const handleAddComment = (content: string) => {
    if (userId === null) return Promise.resolve(false)
    return save(
      () => addComment({ variables: { input: { courseId, content, author: userId } } }),
      "Commentaire publié",
      "Le commentaire n'a pas pu être publié",
    )
  }

  const handleAddCompetency = ({ name, description }: { name: string; description: string }) =>
    save(
      () => addCompetency({ variables: { input: { courseId, name, description } } }),
      "Compétence ajoutée",
      "La compétence n'a pas pu être ajoutée",
    )

  const handleValidateCompetency = (competencyId: number) =>
    save(
      () => validateCompetency({ variables: { competencyId } }),
      "Compétence validée",
      "La compétence n'a pas pu être validée",
    )

  const handleRate = (rating: number, feedback: string) =>
    save(
      () => rateCourse({ variables: { id: courseId, rating: Math.round(rating), feedback } }),
      "Avis enregistré",
      "L'avis n'a pas pu être enregistré",
    )

  const givesCourse = course !== null && userId !== null && Number(course.instructor.id) === userId
  const takesCourse = course !== null && userId !== null && Number(course.student.id) === userId
  const isAdmin = isAdministrator(userData)
  const status = course ? courseStatus(course.status) : null
  const counterpart = course ? courseCounterpart(course, userId) : null

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-3 mb-2 text-muted-foreground">
          <Link href={learningRoutes.courses}>
            <ArrowLeft className="h-4 w-4" />
            Mes cours
          </Link>
        </Button>
        <PageHeader
          className="mb-0"
          title={course ? `Cours du ${formatDate(course.startTime)}` : "Cours"}
          description={
            course && counterpart
              ? `${courseHours(course)} · ${counterpart.role} : ${personName(counterpart.person)}`
              : undefined
          }
          actions={status ? <Badge variant={status.variant}>{status.label}</Badge> : undefined}
        />
      </div>

      {loading && !course ? (
        <CourseSkeleton />
      ) : !course ? (
        <ErrorState
          title="Cours introuvable"
          description={
            error
              ? "Ce cours n'a pas pu être chargé. Il n'existe peut-être plus, ou vous n'y participez pas."
              : "Ce cours n'existe pas ou plus."
          }
          onRetry={() => refetch()}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <CompetenciesCard
              competencies={course.competencies}
              canManage={givesCourse || isAdmin}
              onAdd={handleAddCompetency}
              onValidate={handleValidateCompetency}
            />
            <CommentsCard
              comments={(course.comments ?? []).filter((comment) => comment.author)}
              onAdd={handleAddComment}
            />
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Date</dt>
                    <dd className="font-medium">{formatDate(course.startTime)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Horaire</dt>
                    <dd className="font-medium tabular-nums">{courseHours(course)}</dd>
                  </div>
                </dl>
                <div className="space-y-3 border-t pt-4">
                  <Participant person={course.instructor} role={givesCourse ? "Instructeur (vous)" : "Instructeur"} />
                  <Participant person={course.student} role={takesCourse ? "Élève (vous)" : "Élève"} />
                </div>
              </CardContent>
            </Card>

            <RatingCard
              rating={course.rating}
              feedback={course.feedback}
              canRate={takesCourse || isAdmin}
              isOwnRating={takesCourse}
              onRate={handleRate}
            />
          </div>
        </div>
      )}
    </div>
  )
}
