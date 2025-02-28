"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@apollo/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Calendar, List } from "lucide-react"
import CourseList from "@/components/courses/CourseList"
import CourseCalendar from "@/components/courses/CourseCalendar"
import NewCourseModal from "@/components/courses/NewCourseModal"
import { GET_COURSE_BY_USER_ID } from "@/graphql/course"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"

export default function Home() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [filter, setFilter] = useState("all")
  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = useState(false)
  const userEmail = useCurrentUser();
  const userData = useUserData(userEmail);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    if (userData) {
      setUserId(Number(userData.id));
    }
  }, [userData]);
  const userRole = userData?.role;
  const { loading, error, data } = useQuery(GET_COURSE_BY_USER_ID, {
    variables: { userId },
  })

  if (loading) return <p>Chargement...</p>
  if (error) return <p>Erreur : {error.message}</p>

  const filteredCourses = data?.getCoursesByUserId?.filter((course: any) => {
    if (filter === "all") return true
    if (filter === "upcoming") return new Date(course.startTime) > new Date()
    if (filter === "completed") return new Date(course.startTime) < new Date()
    return true
  })

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
          <Input placeholder="Rechercher un cours" className="pl-8" />
        </div>
        <div className="flex space-x-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer les cours" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les cours</SelectItem>
              <SelectItem value="upcoming">À venir</SelectItem>
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
          <CardTitle>Cours ({userRole === "instructor" ? "Instructeur" : "Élève"})</CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === "list" ? (
            <CourseList courses={filteredCourses} userRole={userRole} />
          ) : (
            <CourseCalendar courses={filteredCourses} userId={userId!} userRole={userRole} />
          )}
        </CardContent>
      </Card>

      <NewCourseModal isOpen={isNewCourseModalOpen} onClose={() => setIsNewCourseModalOpen(false)} />
    </div>
  )
}
