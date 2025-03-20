"use client"

import type React from "react"

import { useState } from "react"
import { useQuery } from "@apollo/client"
import { GET_EVALUATIONS_BY_MODULE } from "@/graphql/evaluation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { CheckCircle, BookOpen, FileText, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { ApolloError } from "@apollo/client"
import Link from "next/link"

export interface Lesson {
  id: string
  title: string
}

interface Evaluation {
  id: string
  pass_score: number
}

interface Module {
  id: string
  title: string
  lessons: Lesson[]
}

interface Course {
  id: string
  title: string
  description: string
  required_license: string
  modules: Module[]
}

interface CourseDetailsProps {
  course: Course
  courseProgress: number
  progressLoading: boolean
  progressError: ApolloError | undefined
  setSelectedLesson: (lesson: Lesson) => void
}

export function CourseDetails({
  course,
  courseProgress,
  progressLoading,
  progressError,
  setSelectedLesson,
}: CourseDetailsProps) {
  const [expandedModule, setExpandedModule] = useState<string>("")

  const sortedModules = [...course.modules].sort((a, b) => Number.parseInt(a.id) - Number.parseInt(b.id))

  return (
    <Card className="border border-gray-200 dark:border-gray-700 shadow-sm" suppressHydrationWarning>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <CardTitle className="text-2xl font-bold">{course.title}</CardTitle>
            <CardDescription className="mt-2 text-base">{course.description}</CardDescription>
          </div>
          <Badge variant="secondary" className="self-start sm:self-auto px-3 py-1 text-sm">
            {course.required_license}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Progression du cours</h3>
            <span className="text-sm font-medium">{Math.round(courseProgress)}%</span>
          </div>

          {progressLoading ? (
            <Skeleton className="h-2 w-full" />
          ) : progressError ? (
            <div className="flex items-center text-red-500 dark:text-red-400 text-sm mt-1">
              <AlertCircle className="h-4 w-4 mr-1" />
              Erreur lors du chargement de la progression
            </div>
          ) : (
            <Progress
              value={courseProgress}
              className="h-2 w-full"
              style={
                {
                  "--progress-value": `${courseProgress}%`,
                } as React.CSSProperties
              }
            />
          )}
          <style jsx global>{`
            .progress-indicator {
              width: var(--progress-value) !important;
            }
          `}</style>
        </div>

        <h3 className="text-lg font-semibold mb-4">Modules du cours</h3>

        <Accordion
          type="single"
          collapsible
          className="w-full"
          value={expandedModule}
          onValueChange={setExpandedModule}
        >
          {sortedModules.map((module) => (
            <AccordionItem
              key={module.id}
              value={module.id}
              className="border border-gray-200 dark:border-gray-700 rounded-md mb-3 overflow-hidden"
            >
              <AccordionTrigger className="px-3 sm:px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
                <div className="flex items-center">
                  <div className="p-1.5 sm:p-2 rounded-full bg-primary/10 mr-2 sm:mr-3">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <span className="font-medium text-sm sm:text-base truncate">{module.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 sm:px-4 pt-2 pb-4">
                <ModuleContent
                  module={module}
                  setSelectedLesson={setSelectedLesson}
                  isExpanded={expandedModule === module.id}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  )
}

interface ModuleContentProps {
  module: Module
  setSelectedLesson: (lesson: Lesson) => void
  isExpanded: boolean
}

function ModuleContent({ module, setSelectedLesson, isExpanded }: ModuleContentProps) {
  const { data, loading, error } = useQuery(GET_EVALUATIONS_BY_MODULE, {
    variables: { moduleId: Number.parseInt(module.id) },
    skip: !isExpanded,
  })

  if (loading)
    return (
      <div className="space-y-3 mt-2" suppressHydrationWarning>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    )

  if (error)
    return (
      <div
        className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-3 mt-2 text-sm flex items-center"
        suppressHydrationWarning
      >
        <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
        Erreur: {error.message}
      </div>
    )

  const evaluations = data?.getEvaluationsByModule || []
  const sortedLessons = [...module.lessons].sort((a, b) => Number.parseInt(a.id) - Number.parseInt(b.id))

  return (
    <div className="space-y-2 pl-2 sm:pl-10">
      <h4 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Leçons</h4>

      {sortedLessons.map((lesson) => (
        <Button
          key={lesson.id}
          variant="ghost"
          className="w-full justify-start text-xs sm:text-sm h-auto py-1.5 sm:py-2 px-2 sm:px-3 rounded-md"
          onClick={() => setSelectedLesson(lesson)}
        >
          <CheckCircle className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
          <span className="text-left truncate">{lesson.title}</span>
        </Button>
      ))}

      {evaluations.length > 0 && (
        <>
          <h4 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mt-4 mb-2">Évaluations</h4>

          {evaluations.map((evaluation: Evaluation) => (
            <Link key={evaluation.id} href={`evaluation/${evaluation.id}`} passHref className="block w-full">
              <Button
                variant="outline"
                className="w-full justify-start text-xs sm:text-sm h-auto py-1.5 sm:py-2 px-2 sm:px-3 rounded-md border-primary/20 bg-primary/5 hover:bg-primary/10"
              >
                <FileText className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                <span className="truncate">Évaluation du module</span>
                <Badge variant="secondary" className="ml-auto text-xs whitespace-nowrap">
                  Min: {evaluation.pass_score}%
                </Badge>
              </Button>
            </Link>
          ))}
        </>
      )}
    </div>
  )
}
