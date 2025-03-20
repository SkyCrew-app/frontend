export interface Question {
  id: number
  content: {
    text: string
    image?: string
    explanation?: string
  }
  options: string[]
  correct_answer: string
}

export interface Evaluation {
  id: number
  module: {
    id: number
    title: string
  }
  pass_score: number
  questions: Question[]
}

export interface Module {
  id: number
  title: string
  description: string
}

export interface UserProgress {
  id: number
  score: number | null
  passed: boolean
  completed_at: string | null
  evaluation: Evaluation
}