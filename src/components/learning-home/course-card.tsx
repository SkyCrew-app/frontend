"use client"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock } from "lucide-react"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import type { Course } from "@/interfaces/instruction"
import { motion } from "framer-motion"

interface CourseCardProps {
  course: Course
  onClick?: () => void
}

export function CourseCard({ course, onClick }: CourseCardProps) {
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

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "d MMMM yyyy", { locale: fr })
    } catch (e) {
      return "Date invalide"
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="flex items-center justify-between p-3 bg-muted/40 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-medium truncate max-w-[150px] sm:max-w-[200px] md:max-w-[250px]">{course.title}</span>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" />
            <span>{formatDate(course.date)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
          <AvatarImage src={course.instructor.avatar} alt={course.instructor.name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {course.instructor.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <Badge className={getStatusColor(course.status)}>{getStatusLabel(course.status)}</Badge>
      </div>
    </motion.div>
  )
}
