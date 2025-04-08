"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@apollo/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Calendar, List } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { useToast } from "@/components/hooks/use-toast"
import CourseList from "@/components/courses/CourseList"
import CourseCalendar from "@/components/courses/CourseCalendar"
import NewCourseModal from "@/components/courses/NewCourseModal"
import { GET_COURSE_BY_USER_ID } from "@/graphql/course"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"

export default function InstructionDashboard() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = useState(false)
  const { toast } = useToast()

  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<number | null>(null)

  useEffect(() => {
    if (userData) {
      setUserId(Number(userData.id))
    }
  }, [userData])

  const userRole = userData?.role?.role_name || "student"
  const isInstructor = userRole === "INSTRUCTOR"

  const { loading, error, data, refetch } = useQuery(GET_COURSE_BY_USER_ID, {
    variables: { userId },
    skip: !userId,
  })

  const handleRefresh = () => {
    refetch()
    toast({
      title: "Actualisation",
      description: "Les données ont été actualisées.",
    })
  }

  const filteredCourses =
    data?.getCoursesByUserId?.filter((course: any) => {
      const matchesSearch =
        course.instructor.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()))

      let matchesFilter = true
      if (filter === "upcoming") {
        matchesFilter = course.status === "SCHEDULED"
      } else if (filter === "inProgress") {
        matchesFilter = course.status === "IN_PROGRESS"
      } else if (filter === "completed") {
        matchesFilter = course.status === "COMPLETED"
      }

      return matchesSearch && matchesFilter
    }) || []

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Une erreur est survenue lors du chargement des cours. Veuillez réessayer plus tard.
            <br />
            {error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-background text-foreground">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Mes Cours</h1>
        <Button onClick={() => setIsNewCourseModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau Cours
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un cours"
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex space-x-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer les cours" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les cours</SelectItem>
              <SelectItem value="upcoming">À venir</SelectItem>
              <SelectItem value="inProgress">En cours</SelectItem>
              <SelectItem value="completed">Terminés</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("calendar")}
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cours ({isInstructor ? "Instructeur" : "Élève"})</CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === "list" ? (
            <CourseList
              courses={filteredCourses}
              userRole={isInstructor ? "instructor" : "student"}
              userId={userId ?? undefined}
              onRefresh={handleRefresh}
            />
          ) : (
            <CourseCalendar
              courses={filteredCourses}
              userId={userId!}
              userRole={isInstructor ? "instructor" : "student"}
            />
          )}
        </CardContent>
      </Card>

      <NewCourseModal
        isOpen={isNewCourseModalOpen}
        onClose={() => setIsNewCourseModalOpen(false)}
        onSuccess={() => {
          refetch()
          toast({
            title: "Cours créé",
            description: "Le nouveau cours a été créé avec succès.",
          })
        }}
      />
    </div>
  )
}
