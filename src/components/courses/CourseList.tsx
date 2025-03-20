"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import Link from "next/link"
import { Star, Clock, Edit2, Check, X, FileText, AlertTriangle, Trash2 } from "lucide-react"
import { useMutation, useQuery } from "@apollo/client"
import { UPDATE_COURSE, DELETE_COURSE, GET_USERS } from "@/graphql/course"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { useToast } from "@/components/hooks/use-toast"
import { Spinner } from "@/components/ui/spinner"

type Instructor = {
  id: number
  first_name: string
  last_name: string
}

type Student = {
  id: number
  first_name: string
  last_name: string
}

type Course = {
  id: number
  instructor: Instructor
  student: Student
  startTime: string
  endTime: string | null
  status: string
  rating: number | null
  description?: string
  competencies: { id: number; name: string; description: string; validated: boolean }[]
}

type CourseListProps = {
  courses: Course[]
  userRole: "instructor" | "student"
  userId?: number
  onRefresh?: () => void
}

export default function CourseList({ courses = [], userRole, userId, onRefresh }: CourseListProps) {
  const [editingCourse, setEditingCourse] = useState<number | null>(null)
  const [editStartTime, setEditStartTime] = useState("")
  const [editEndTime, setEditEndTime] = useState("")
  const [editInstructor, setEditInstructor] = useState("")
  const [editStudent, setEditStudent] = useState("")
  const [editStatus, setEditStatus] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<number | null>(null)

  const { toast } = useToast()
  const [updateCourse, { loading: updateLoading }] = useMutation(UPDATE_COURSE)
  const [deleteCourse, { loading: deleteLoading }] = useMutation(DELETE_COURSE)
  const { data: usersData } = useQuery(GET_USERS)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "COMPLETED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "CANCELLED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "Planifié"
      case "IN_PROGRESS":
        return "En cours"
      case "COMPLETED":
        return "Terminé"
      case "CANCELLED":
        return "Annulé"
      default:
        return status
    }
  }

  const handleEdit = (course: Course) => {
    setEditingCourse(course.id)
    setEditStartTime(format(parseISO(course.startTime), "yyyy-MM-dd'T'HH:mm"))
    setEditEndTime(course.endTime ? format(parseISO(course.endTime), "yyyy-MM-dd'T'HH:mm") : "")
    setEditInstructor(course.instructor.id.toString())
    setEditStudent(course.student.id.toString())
    setEditStatus(course.status)
  }

  const handleSave = async (courseId: number) => {
    try {
      await updateCourse({
        variables: {
          id: courseId,
          input: {
            startTime: editStartTime,
            endTime: editEndTime || null,
            instructorId: Number.parseInt(editInstructor, 10),
            studentId: Number.parseInt(editStudent, 10),
            status: editStatus,
          },
        },
      })
      setEditingCourse(null)
      onRefresh && onRefresh()
      toast({
        title: "Cours mis à jour",
        description: "Les informations du cours ont été mises à jour avec succès.",
      })
    } catch (error) {
      console.error("Error updating course:", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour du cours.",
      })
    }
  }

  const handleCancel = () => {
    setEditingCourse(null)
  }

  const confirmDelete = (courseId: number) => {
    setCourseToDelete(courseId)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!courseToDelete) return

    try {
      await deleteCourse({
        variables: {
          id: courseToDelete,
        },
      })
      setIsDeleteDialogOpen(false)
      setCourseToDelete(null)
      onRefresh && onRefresh()
      toast({
        title: "Cours supprimé",
        description: "Le cours a été supprimé avec succès.",
      })
    } catch (error) {
      console.error("Error deleting course:", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression du cours.",
      })
    }
  }

  const instructors = usersData?.getUsers.filter((user: any) => user.role?.role_name === "INSTRUCTOR") || []
  const students = usersData?.getUsers.filter((user: any) => user.role?.role_name === "STUDENT") || []

  const canEditCourse = (course: Course) => {
    return userRole === "instructor" && course.instructor.id === userId
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{userRole === "instructor" ? "Élève" : "Instructeur"}</TableHead>
              <TableHead>Date et Heure de début</TableHead>
              <TableHead>Date et Heure de fin</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Compétences</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length > 0 ? (
              courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">
                    {editingCourse === course.id ? (
                      <Select
                        value={userRole === "instructor" ? editStudent : editInstructor}
                        onValueChange={userRole === "instructor" ? setEditStudent : setEditInstructor}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue
                            placeholder={
                              userRole === "instructor" ? "Sélectionner un élève" : "Sélectionner un instructeur"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {(userRole === "instructor" ? students : instructors).map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.first_name} {user.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex flex-col">
                        <span>
                          {userRole === "instructor" ? course.student.first_name : course.instructor.first_name}{" "}
                          {userRole === "instructor" ? course.student.last_name : course.instructor.last_name}
                        </span>
                        {course.description && (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {course.description}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingCourse === course.id ? (
                      <Input
                        type="datetime-local"
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="w-full"
                      />
                    ) : (
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        {format(parseISO(course.startTime), "d MMM yyyy HH:mm", { locale: fr })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingCourse === course.id ? (
                      <Input
                        type="datetime-local"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        className="w-full"
                      />
                    ) : course.endTime ? (
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        {format(parseISO(course.endTime), "d MMM yyyy HH:mm", { locale: fr })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Non défini</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingCourse === course.id ? (
                      <Select value={editStatus} onValueChange={setEditStatus}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SCHEDULED">Planifié</SelectItem>
                          <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                          <SelectItem value="COMPLETED">Terminé</SelectItem>
                          <SelectItem value="CANCELLED">Annulé</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={getStatusColor(course.status)}>{getStatusLabel(course.status)}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span>{course.competencies.length}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {course.rating ? (
                      <div className="flex items-center">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
                        <span>{course.rating}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingCourse === course.id ? (
                      <div className="flex space-x-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSave(course.id)}
                          disabled={updateLoading}
                        >
                          {updateLoading ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleCancel}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex space-x-2 justify-end">
                        {canEditCourse(course) && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(course)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => confirmDelete(course.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        <Link href={`/instruction/courses/${course.id}`}>
                          <Button variant="outline" size="sm">
                            Détails
                          </Button>
                        </Link>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FileText className="h-12 w-12 mb-2 opacity-20" />
                    <p>Aucun cours trouvé</p>
                    <p className="text-sm">Ajustez vos filtres ou créez un nouveau cours</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce cours ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            <AlertTriangle className="h-16 w-16 text-destructive" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
