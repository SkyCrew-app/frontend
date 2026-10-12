import { courseLessonIds } from './learning-progress'

type CourseOutline = Parameters<typeof courseLessonIds>[0]

type Id = number | string

// Routes of the learning area, always absolute.
export const learningRoutes = {
  home: '/instruction',
  courses: '/instruction/courses',
  course: (id: Id) => `/instruction/courses/${id}`,
  eLearning: '/instruction/e-learning',
  eLearningCourse: (courseId: Id) => `/instruction/e-learning/${courseId}`,
  lesson: (courseId: Id, lessonId: Id) => `/instruction/e-learning/${courseId}/${lessonId}`,
  evaluations: '/instruction/evaluation',
  evaluation: (id: Id) => `/instruction/evaluation/${id}`,
} as const

export interface AdjacentLessons {
  previous: number | null
  next: number | null
  // 1-based rank of the lesson in the course, null when it is not part of it.
  position: number | null
  total: number
}

// Neighbours of a lesson in the reading order of its course. A lesson that does
// not belong to the course has no neighbour.
export function adjacentLessons(course: CourseOutline, lessonId: Id): AdjacentLessons {
  const ids = courseLessonIds(course)
  const index = ids.indexOf(Number(lessonId))
  if (index === -1) return { previous: null, next: null, position: null, total: ids.length }
  return {
    previous: index > 0 ? ids[index - 1] : null,
    next: index < ids.length - 1 ? ids[index + 1] : null,
    position: index + 1,
    total: ids.length,
  }
}

// A video link as pasted by an administrator, turned into the address a
// player frame can load. Links that are not YouTube ones are kept as they are.
export function videoEmbedUrl(url: string | null | undefined): string | null {
  const value = url?.trim()
  if (!value) return null
  const short = value.match(/^https?:\/\/youtu\.be\/([\w-]+)/)
  if (short) return `https://www.youtube.com/embed/${short[1]}`
  const watch = value.match(/^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([\w-]+)/)
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`
  return value
}
