import { courseCounterpart, courseStatus, personInitials, personName, upcomingCourses } from "../course-helpers"

describe("courseStatus", () => {
  it("donne le même libellé aux deux orthographes d'un cours annulé", () => {
    expect(courseStatus("CANCELED")).toEqual(courseStatus("CANCELLED"))
    expect(courseStatus("CANCELED").label).toBe("Annulé")
  })

  it("ne montre jamais un code brut", () => {
    expect(courseStatus("SOMETHING_NEW").label).toBe("Statut inconnu")
    expect(courseStatus(null).variant).toBe("neutral")
  })
})

describe("personName", () => {
  it("assemble prénom et nom", () => {
    expect(personName({ id: 1, first_name: "Léa", last_name: "Martin" })).toBe("Léa Martin")
    expect(personName({ id: 1, first_name: "Léa" })).toBe("Léa")
    expect(personInitials({ id: 1, first_name: "léa", last_name: "martin" })).toBe("LM")
  })

  it("affiche un tiret quand le nom manque", () => {
    expect(personName(null)).toBe("—")
  })
})

describe("courseCounterpart", () => {
  const course = { instructor: { id: 1, first_name: "Paul" }, student: { id: "2", first_name: "Léa" } }

  it("montre l'élève à l'instructeur du cours", () => {
    expect(courseCounterpart(course, "1")).toEqual({ person: course.student, role: "Élève" })
  })

  it("montre l'instructeur à l'élève", () => {
    expect(courseCounterpart(course, 2)).toEqual({ person: course.instructor, role: "Instructeur" })
  })
})

describe("upcomingCourses", () => {
  const now = new Date("2026-10-12T10:00:00Z")
  const course = (id: number, startTime: string, status: string) => ({ id, startTime, status })

  it("garde les cours planifiés à venir et les cours en cours, du plus proche au plus lointain", () => {
    const courses = [
      course(1, "2026-10-20T10:00:00Z", "SCHEDULED"),
      course(2, "2026-10-01T10:00:00Z", "SCHEDULED"),
      course(3, "2026-10-13T10:00:00Z", "SCHEDULED"),
      course(4, "2026-10-12T09:00:00Z", "IN_PROGRESS"),
      course(5, "2026-10-14T10:00:00Z", "CANCELED"),
      course(6, "2026-10-15T10:00:00Z", "COMPLETED"),
    ]
    expect(upcomingCourses(courses, now).map((item) => item.id)).toEqual([4, 3, 1])
  })

  it("accepte une liste absente", () => {
    expect(upcomingCourses(undefined, now)).toEqual([])
  })
})
