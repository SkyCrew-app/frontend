// Role names as the API returns them.
export const ROLE_ADMIN = "Administrateur"
export const ROLE_INSTRUCTOR = "Instructeur"

type WithRole = { role?: { role_name?: string | null } | null } | null | undefined

const roleOf = (user: WithRole) => user?.role?.role_name ?? null

export const isAdministrator = (user: WithRole) => roleOf(user) === ROLE_ADMIN
export const isInstructor = (user: WithRole) => roleOf(user) === ROLE_INSTRUCTOR

type Member = { id: number | string } & NonNullable<WithRole>

// Who can be chosen for a course: instructors give it, any other member takes it.
export function courseParticipants<T extends Member>(members: T[] | null | undefined, instructorId?: number | string | null) {
  const all = members ?? []
  return {
    instructors: all.filter(isInstructor),
    students: all.filter((member) => String(member.id) !== String(instructorId ?? "")),
  }
}
