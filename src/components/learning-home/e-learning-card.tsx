"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Play } from "lucide-react"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import type { ELearningCourse } from "@/interfaces/instruction"
import { motion } from "framer-motion"

interface ELearningCardProps {
  course: ELearningCourse
  onClick?: () => void
  compact?: boolean
}

export function ELearningCard({ course, onClick, compact = false }: ELearningCardProps) {
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return ""
    try {
      return format(parseISO(dateString), "d MMMM yyyy", { locale: fr })
    } catch (e) {
      return "Date invalide"
    }
  }

  const progressPercentage = Math.round((course.completedLessons / course.totalLessons) * 100)

  return (
    <motion.div
      whileHover={{ scale: compact ? 1.01 : 1.02 }}
      className={`${compact ? "p-3" : "p-4 border"} rounded-lg hover:shadow-md transition-all cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 mb-2 overflow-hidden">
        <div>
          <h3 className={`${compact ? "text-base" : "text-lg"} font-medium truncate max-w-full`}>{course.title}</h3>
          <p className="text-sm text-muted-foreground">{course.category}</p>
        </div>
        <Badge
          variant="outline"
          className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300"
        >
          {course.completedLessons}/{course.totalLessons} leçons
        </Badge>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Progression</span>
          <span>{progressPercentage}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>
      {course.lastAccessedDate && (
        <p className="text-xs text-muted-foreground mt-2">Dernier accès: {formatDate(course.lastAccessedDate)}</p>
      )}
      {!compact && (
        <div className="mt-4">
          <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600">
            <Play className="mr-2 h-4 w-4" />
            Continuer
          </Button>
        </div>
      )}
    </motion.div>
  )
}
