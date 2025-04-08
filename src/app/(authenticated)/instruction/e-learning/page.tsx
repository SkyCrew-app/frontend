"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { useQuery } from "@apollo/client"
import { GET_COURSES, GET_COURSE_DETAILS, GET_LESSON_CONTENT, GET_COURSE_PROGRESS } from "@/graphql/instruction"
import { CourseSearch } from "@/components/e-learning/CourseSearch"
import { CourseList } from "@/components/e-learning/CourseList"
import { CourseDetails, type Lesson as CourseDetailsLesson } from "@/components/e-learning/CourseDetails"
import { LessonContent } from "@/components/e-learning/LessonContent"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { Course, Lesson } from "@/interfaces/courses"

export default function ELearningPage() {
  const [mounted, setMounted] = useState(false)
  const { theme, resolvedTheme } = useTheme()
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [category, setCategory] = useState("all")
  const [courseProgress, setCourseProgress] = useState<number>(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)

    const isDark = theme === "dark" || resolvedTheme === "dark"
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      const isDark = theme === "dark" || resolvedTheme === "dark"
      document.documentElement.classList.toggle("dark", isDark)
    }
  }, [mounted, theme, resolvedTheme])

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const {
    data: coursesData,
    loading: coursesLoading,
    error: coursesError,
    refetch: refetchCourses,
  } = useQuery(GET_COURSES, {
    variables: {
      category: category === "all" ? null : category,
      search: searchTerm,
    },
    fetchPolicy: "network-only",
  })

  const {
    data: courseData,
    loading: courseLoading,
    error: courseError,
  } = useQuery(GET_COURSE_DETAILS, {
    variables: { id: selectedCourseId ? Number.parseFloat(selectedCourseId) : null, userId },
    skip: !selectedCourseId,
  })

  const {
    data: lessonData,
    loading: lessonLoading,
    error: lessonError,
  } = useQuery(GET_LESSON_CONTENT, {
    variables: { lessonId: selectedLesson?.id, userId },
    skip: !selectedLesson,
  })

  const {
    data: progressData,
    loading: progressLoading,
    error: progressError,
  } = useQuery(GET_COURSE_PROGRESS, {
    variables: { userId, courseId: selectedCourseId ? Number.parseFloat(selectedCourseId) : null },
    skip: !selectedCourseId,
  })

  useEffect(() => {
    if (progressData && progressData.getCourseProgress) {
      setCourseProgress(progressData.getCourseProgress)
    }
  }, [progressData])

  const handleSetCategory = (newCategory: string) => {
    setCategory(newCategory)
    setTimeout(() => {
      refetchCourses({
        category: newCategory === "all" ? null : newCategory,
        search: searchTerm,
      })
    }, 0)
  }

  const handleSetSearchTerm = (term: string) => {
    setSearchTerm(term)
    setTimeout(() => {
      refetchCourses({
        category: category === "all" ? null : category,
        search: term,
      })
    }, 0)
  }

  const courses = coursesData?.getCourses || []
  const course = courseData?.getCourseById as Course | undefined
  const lessonContent = lessonData?.getLessonContent as Lesson | undefined

  useEffect(() => {
    if (selectedCourseId && window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [selectedCourseId])

  if (!mounted) {
    return (
      <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50 dark:bg-gray-900" suppressHydrationWarning>
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-4 flex items-center">
            <h1 className="text-xl font-semibold truncate">Chargement...</h1>
          </header>
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-6 max-w-6xl">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-[200px] w-full mt-4" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Overlay pour mobile quand la sidebar est ouverte */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-white dark:bg-gray-800 w-full lg:w-80 lg:min-h-screen flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? "fixed inset-0 z-30" : "hidden lg:flex"}`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Cours disponibles</h2>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <CourseSearch
            searchTerm={searchTerm}
            setSearchTerm={handleSetSearchTerm}
            category={category}
            setCategory={handleSetCategory}
          />
        </div>
        <div className="flex-grow overflow-y-auto">
          <CourseList
            courses={courses}
            selectedCourseId={selectedCourseId}
            setSelectedCourseId={setSelectedCourseId}
            coursesLoading={coursesLoading}
            coursesError={coursesError}
          />
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-4 flex items-center">
          <Button variant="outline" size="icon" className="lg:hidden mr-4" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold truncate">
            {course ? course.title : "Plateforme d'apprentissage en ligne"}
          </h1>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 py-6 max-w-6xl">
            {courseLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-[200px] w-full" />
              </div>
            ) : courseError ? (
              <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-100 p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-medium mb-2">Erreur de chargement</h3>
                <p>{courseError.message}</p>
              </div>
            ) : course ? (
              <div className="space-y-8">
                <CourseDetails
                  course={course}
                  courseProgress={courseProgress}
                  progressLoading={progressLoading}
                  progressError={progressError}
                  setSelectedLesson={(lesson: CourseDetailsLesson) => setSelectedLesson(lesson as Lesson)}
                />
                {selectedLesson && (
                  <LessonContent
                    lesson={lessonContent}
                    courseId={selectedCourseId || ""}
                    lessonLoading={lessonLoading}
                    lessonError={lessonError ? { message: lessonError.message } : null}
                  />
                )}
              </div>
            ) : (
              <div className="text-center py-16 px-4">
                <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-bold mb-4">Bienvenue sur la plateforme d'apprentissage</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Sélectionnez un cours dans la liste pour commencer votre apprentissage.
                  </p>
                  <Button
                    variant="outline"
                    className="lg:hidden w-full sm:w-auto text-sm"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="h-4 w-4 mr-2" />
                    <span className="truncate">Voir les cours disponibles</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

