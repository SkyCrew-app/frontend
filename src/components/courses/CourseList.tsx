"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation } from "@apollo/client"
import { ChevronRight, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/hooks/use-toast"
import { ConfirmDeleteDialog } from "@/components/e-learning/ConfirmDeleteDialog"
import { DELETE_COURSE } from "@/graphql/course"
import { formatDate } from "@/lib/format"
import { learningRoutes } from "@/lib/learning-navigation"
import CourseFormDialog from "./CourseFormDialog"
import {
  courseCounterpart,
  courseHours,
  courseStatus,
  personName,
  type InstructionCourse,
} from "./course-helpers"

type CourseListProps = {
  courses: InstructionCourse[]
  userId: number | null
  // An administrator may modify any course, an instructor only the ones they give.
  isAdministrator?: boolean
  onChanged: () => void
}

export default function CourseList({ courses, userId, isAdministrator = false, onChanged }: CourseListProps) {
  const router = useRouter()
  const { toast } = useToast()
  // The edited course is kept while its dialog closes, so the dialog does not change under the eyes.
  const [courseToEdit, setCourseToEdit] = useState<InstructionCourse | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<InstructionCourse | null>(null)
  const [deleteCourse, { loading: deleting }] = useMutation(DELETE_COURSE)

  const givesCourse = (course: InstructionCourse) => userId !== null && Number(course.instructor.id) === userId
  const canEdit = (course: InstructionCourse) => isAdministrator || givesCourse(course)

  const handleDelete = async () => {
    if (!courseToDelete) return
    try {
      await deleteCourse({ variables: { id: courseToDelete.id } })
      setCourseToDelete(null)
      onChanged()
      toast({ title: "Cours supprimé", description: "Le cours a été retiré de la liste." })
    } catch {
      toast({
        variant: "destructive",
        title: "Cours non supprimé",
        description: "La suppression a échoué. Réessayez dans un instant.",
      })
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Horaire</TableHead>
              <TableHead>Avec</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Compétences validées</TableHead>
              <TableHead className="text-right">Note</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => {
              const { person, role } = courseCounterpart(course, userId)
              const status = courseStatus(course.status)
              const validated = course.competencies.filter((competency) => competency.validated).length
              const href = learningRoutes.course(course.id)

              return (
                <TableRow key={course.id} className="cursor-pointer" onClick={() => router.push(href)}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {/* The link keeps the row reachable from the keyboard. */}
                    <Link href={href} onClick={(event) => event.stopPropagation()} className="hover:underline">
                      {formatDate(course.startTime)}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{courseHours(course)}</TableCell>
                  <TableCell>
                    <div className="min-w-[8rem]">
                      <p className="font-medium">{personName(person)}</p>
                      <p className="text-xs text-muted-foreground">{role}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {course.competencies.length > 0 ? `${validated} / ${course.competencies.length}` : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {course.rating ? (
                      <span className="inline-flex items-center justify-end gap-2">
                        <Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                        {course.rating} / 5
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    {canEdit(course) ? (
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Actions du cours" title="Actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={href}>
                              <ChevronRight className="h-4 w-4" />
                              Ouvrir le cours
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setCourseToEdit(course)
                              setIsEditOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setCourseToDelete(course)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                        <Link href={href} aria-label="Ouvrir le cours" title="Ouvrir le cours">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <CourseFormDialog
        open={isEditOpen}
        course={courseToEdit}
        // Only an administrator chooses the instructor of someone else's course.
        instructorId={courseToEdit && !isAdministrator ? Number(courseToEdit.instructor.id) : null}
        onClose={() => setIsEditOpen(false)}
        onSaved={onChanged}
      />

      <ConfirmDeleteDialog
        open={courseToDelete !== null}
        onOpenChange={(open) => !open && setCourseToDelete(null)}
        title="Supprimer ce cours ?"
        description={
          courseToDelete
            ? `Le cours du ${formatDate(courseToDelete.startTime)} avec ${personName(courseCounterpart(courseToDelete, userId).person)} sera définitivement supprimé.`
            : ""
        }
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
