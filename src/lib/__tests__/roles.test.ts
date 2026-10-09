import { courseParticipants, isAdministrator, isInstructor } from "../roles"

const admin = { id: 1, role: { role_name: "Administrateur" } }
const pilot = { id: 3, role: { role_name: "Pilote" } }
const instructor = { id: 4, role: { role_name: "Instructeur" } }
const otherInstructor = { id: 5, role: { role_name: "Instructeur" } }
const noRole = { id: 9, role: null }

describe("roles", () => {
  it("recognises the roles by the name the API returns", () => {
    expect(isInstructor(instructor)).toBe(true)
    expect(isInstructor(pilot)).toBe(false)
    expect(isInstructor({ role: { role_name: "INSTRUCTOR" } })).toBe(false)
    expect(isAdministrator(admin)).toBe(true)
    expect(isAdministrator(noRole)).toBe(false)
    expect(isAdministrator(undefined)).toBe(false)
  })

  it("only offers instructors to give a course", () => {
    const { instructors } = courseParticipants([admin, pilot, instructor, otherInstructor, noRole])
    expect(instructors).toEqual([instructor, otherInstructor])
  })

  it("offers every member but the instructor of the course to take it", () => {
    const { students } = courseParticipants([admin, pilot, instructor, otherInstructor], "4")
    expect(students).toEqual([admin, pilot, otherInstructor])
  })

  it("copes with a directory that is not loaded yet", () => {
    expect(courseParticipants(undefined)).toEqual({ instructors: [], students: [] })
  })
})
