export interface Lesson {
  id: number
  title: string
  description: string
  video_url: string
}

export interface Evaluation {
  id: number
  pass_score: number
}

export interface Module {
  id: number
  title: string
  description: string
  lessons: Lesson[]
  evaluations: Evaluation[]
}

export interface Course {
  id: number
  title: string
  description: string
  category: string
  required_license?: string
  modules: Module[]
}
