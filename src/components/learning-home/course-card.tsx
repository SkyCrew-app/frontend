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
        return "bg-info/15 text-info"
      case "IN_PROGRESS":
        return "bg-warning/15 text-warning"
      case "COMPLETED":
        return "bg-success/15 text-success"
      case "CANCELLED":
        return "bg-destructive/15 text-destructive"
      default:
        return "bg-muted text-foreground"
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
    } catch {
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
