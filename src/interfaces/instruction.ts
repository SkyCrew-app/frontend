export interface InstructionSummary {
  upcomingCourses: Course[]
  recentCourses: Course[]
  certifications: Certification[]
  learningProgress: {
    completedCourses: number
    totalCourses: number
    completedLessons: number
    totalLessons: number
  }
  evaluations: {
    completed: number
    upcoming: number
    averageScore: number
  }
  eLearningCourses: ELearningCourse[]
}

export interface Course {
  id: string
  title: string
  date: string
  instructor: {
    id: string
    name: string
    avatar?: string
  }
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
}

export interface Certification {
  id: string
  name: string
  status: "ACTIVE" | "EXPIRING" | "EXPIRED"
  expiryDate: string
  progress: number
}

export interface ELearningCourse {
  id: string
  title: string
  category: string
  progress: number
  completedLessons: number
  totalLessons: number
  lastAccessedDate?: string
}
