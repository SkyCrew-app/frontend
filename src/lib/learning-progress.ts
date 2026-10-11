type WithId = { id: number | string }

type CourseOutline = { modules: { lessons: WithId[] }[] }

export interface EvaluationAttempt {
  id: number
  score: number | null
  passed: boolean
  completed_at: string | null
  evaluation?: { id: number | string } | null
}

// Share of `done` in `total` as a whole percentage, 0 when there is nothing to do.
export function percentage(done: number, total: number): number {
  // NaN fails both comparisons and counts as nothing done.
  if (Number.isNaN(total) || Number.isNaN(done) || total <= 0 || done <= 0) return 0
  return Math.min(100, Math.round((done / total) * 100))
}

// Lesson ids of a course, in reading order.
export function courseLessonIds(course: CourseOutline | null | undefined): number[] {
  return (course?.modules ?? []).flatMap((module) => module.lessons.map((lesson) => Number(lesson.id)))
}

export function moduleProgress(lessons: WithId[], completedLessonIds: ReadonlySet<number>): number {
  const done = lessons.filter((lesson) => completedLessonIds.has(Number(lesson.id))).length
  return percentage(done, lessons.length)
}

// The lesson to open next: the first one not completed yet, or the first lesson
// when the whole course has been completed.
export function nextLessonId(
  course: CourseOutline | null | undefined,
  completedLessonIds: ReadonlySet<number>,
): number | null {
  const ids = courseLessonIds(course)
  if (ids.length === 0) return null
  return ids.find((id) => !completedLessonIds.has(id)) ?? ids[0]
}

const attemptTime = (attempt: EvaluationAttempt) =>
  attempt.completed_at ? new Date(attempt.completed_at).getTime() || 0 : 0

// An evaluation can be taken several times: keeps the most recent attempt of each.
export function latestEvaluationAttempts(
  attempts: EvaluationAttempt[] | null | undefined,
): Map<number, EvaluationAttempt> {
  const latest = new Map<number, EvaluationAttempt>()
  for (const attempt of attempts ?? []) {
    if (attempt.evaluation?.id == null) continue
    const evaluationId = Number(attempt.evaluation.id)
    const current = latest.get(evaluationId)
    const isNewer =
      !current ||
      attemptTime(attempt) > attemptTime(current) ||
      (attemptTime(attempt) === attemptTime(current) && attempt.id > current.id)
    if (isNewer) latest.set(evaluationId, attempt)
  }
  return latest
}

// Lessons completed and available across the e-learning courses of a member.
export function lessonTotals(
  courses: { completedLessons: number; totalLessons: number }[] | null | undefined,
): { completed: number; total: number } {
  return (courses ?? []).reduce(
    (totals, course) => ({
      completed: totals.completed + (course.completedLessons || 0),
      total: totals.total + (course.totalLessons || 0),
    }),
    { completed: 0, total: 0 },
  )
}

// Always the same index for the same seed, e.g. to give a course a fixed cover.
export function stableIndex(seed: number | string, length: number): number {
  if (length <= 0) return 0
  let hash = 0
  for (const char of String(seed)) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0
  }
  return hash % length
}
