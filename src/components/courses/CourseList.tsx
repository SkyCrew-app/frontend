"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Star, Clock, Edit2, Check, X } from "lucide-react"
import { useMutation, useQuery } from "@apollo/client"
import { UPDATE_COURSE, GET_USERS } from "@/graphql/course"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"

type Instructor = {
  id: number
  first_name: string
}

type Course = {
  id: number
  instructor: Instructor
  student: { id: number; first_name: string }
  startTime: string
  endTime: string | null
  status: string
  rating: number | null
  competencies: { id: number; name: string; description: string; validated: boolean }[]
}

type CourseListProps = {
  courses: Course[]
  userId: number
  userRole: "instructor" | "student"
}

export default function CourseList({ courses = [], userRole }: Omit<CourseListProps, "userId">) {
  const [editingCourse, setEditingCourse] = useState<number | null>(null)
  const [editStartTime, setEditStartTime] = useState("")
  const [editEndTime, setEditEndTime] = useState("")
  const [editInstructor, setEditInstructor] = useState("")

  const [updateCourse] = useMutation(UPDATE_COURSE)
  const { data: instructorsData } = useQuery(GET_USERS)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-primary text-dark-800 dark:bg-blue-900 dark:text-blue-200"
      case "IN_PROGRESS":
        return "bg-yellow-400 text-dark-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "COMPLETED":
        return "bg-destructive text-dark-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
    }
  }

  const handleEdit = (course: Course) => {
    setEditingCourse(course.id)
    setEditStartTime(format(parseISO(course.startTime), "yyyy-MM-dd'T'HH:mm"))
    setEditEndTime(course.endTime ? format(parseISO(course.endTime), "yyyy-MM-dd'T'HH:mm") : "")
    setEditInstructor(course.instructor.id.toString())
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
          },
        },
      })
      setEditingCourse(null)
    } catch (error) {
      console.error("Error updating course:", error)
    }
  }

  const handleCancel = () => {
    setEditingCourse(null)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{userRole === "instructor" ? "Élève" : "Instructeur"}</TableHead>
          <TableHead>Date et Heure de début</TableHead>
          <TableHead>Date et Heure de fin</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Compétences</TableHead>
          <TableHead>Note</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {courses.map((course) => (
          <TableRow key={course.id}>
            <TableCell className="font-medium">
              {editingCourse === course.id ? (
                <Select value={editInstructor} onValueChange={setEditInstructor}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sélectionner un instructeur" />
                  </SelectTrigger>
                  <SelectContent>
                    {(instructorsData?.getUsers ?? []).map((instructor: Instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id.toString()}>
                        {instructor.first_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : userRole === "instructor" ? (
                course.student.first_name
              ) : (
                course.instructor.first_name
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
                  <Clock className="mr-2 h-4 w-4 text-gray-400" />
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
                  <Clock className="mr-2 h-4 w-4 text-gray-400" />
                  {format(parseISO(course.endTime), "d MMM yyyy HH:mm", { locale: fr })}
                </div>
              ) : (
                "Non défini"
              )}
            </TableCell>
            <TableCell>
              <Badge className={getStatusColor(course.status)}>{course.status}</Badge>
            </TableCell>
            <TableCell>{course.competencies.length}</TableCell>
            <TableCell>
              {course.rating && (
                <div className="flex items-center">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
                  <span>{course.rating}</span>
                </div>
              )}
            </TableCell>
            <TableCell>
              {editingCourse === course.id ? (
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleSave(course.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(course)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Link href={`/instruction/courses/${course.id}`}>
                    <Button variant="outline" size="sm">
                      Détails
                    </Button>
                  </Link>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
