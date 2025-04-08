export interface Lesson {
  duration: any
  id: number
  title: string
  description: string
  video_url: string
  completed?: boolean
}

export interface Evaluation {
  id: number
  pass_score: number
  completed?: boolean
  score?: number
}

export interface Module {
  id: number
  title: string
  description: string
  lessons: Lesson[]
  evaluations: Evaluation[]
  progress?: number
}

export interface Course {
  id: number
  title: string
  description: string
  category: string
  required_license?: string
  modules: Module[]
  totalDuration?: number
  totalLessons?: number
  progress?: number
  coverImage?: string
}