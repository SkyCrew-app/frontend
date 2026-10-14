import {
  courseBookingHref,
  courseCounterpart,
  courseDisplayStatus,
  courseRemoval,
  courseStatus,
  isAwaitingConfirmation,
  personInitials,
  personName,
  upcomingCourses,
} from "../course-helpers"

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

describe("un cours planifié dont l'heure est passée", () => {
  const now = new Date("2026-10-13T12:00:00")
  const course = (overrides = {}) => ({
    status: "SCHEDULED",
    startTime: "2026-10-12T09:00:00",
    endTime: "2026-10-12T10:00:00",
    ...overrides,
  })

  it("est « à confirmer » : ni terminé d'office, ni encore planifié", () => {
    expect(isAwaitingConfirmation(course(), now)).toBe(true)
    expect(courseDisplayStatus(course(), now)).toEqual({ label: "À confirmer", variant: "warning" })
  })

  it("garde son statut tant qu'il n'est pas fini, ou dès que l'instructeur a tranché", () => {
    expect(courseDisplayStatus(course({ endTime: "2026-10-13T13:00:00" }), now).label).toBe("Planifié")
    expect(courseDisplayStatus(course({ status: "COMPLETED" }), now).label).toBe("Terminé")
    expect(courseDisplayStatus(course({ status: "CANCELED" }), now).label).toBe("Annulé")
    expect(isAwaitingConfirmation(course({ status: "IN_PROGRESS" }), now)).toBe(false)
  })
})

describe("courseBookingHref", () => {
  it("préremplit la réservation avec le jour, l'horaire, l'élève et l'instructeur du cours", () => {
    const href = courseBookingHref({
      id: 12,
      startTime: new Date(2026, 9, 16, 14, 0).toISOString(),
      endTime: new Date(2026, 9, 16, 16, 0).toISOString(),
      instructor: { id: 3, first_name: "Marie", last_name: "Laurent" },
      student: { id: 9, first_name: "Emma", last_name: "Girard" },
    })
    const [path, query] = href.split("?")
    const params = Object.fromEntries(new URLSearchParams(query))

    expect(path).toBe("/reservations")
    expect(params).toEqual({
      course_id: "12",
      date: "2026-10-16",
      start_time: "14:00",
      end_time: "16:00",
      flight_category: "INSTRUCTION",
      instructor_id: "3",
      instructor: "Marie Laurent",
      student: "Emma Girard",
    })
  })

  it("propose une heure pour un cours sans fin", () => {
    const href = courseBookingHref({
      id: 1,
      startTime: new Date(2026, 9, 16, 9, 30).toISOString(),
      endTime: null,
      instructor: { id: 3 },
      student: { id: 9 },
    })
    expect(new URLSearchParams(href.split("?")[1]).get("end_time")).toBe("10:30")
  })
})

describe("courseRemoval", () => {
  const bare = { status: "SCHEDULED", competencies: [], comments: [], rating: null, feedback: null }

  it("supprime un cours planifié qui n'a laissé aucune trace", () => {
    expect(courseRemoval(bare)).toBe("delete")
  })

  it("annule plutôt qu'il ne supprime un cours planifié qui porte des compétences, des commentaires ou une note", () => {
    expect(courseRemoval({ ...bare, competencies: [{ id: 1, name: "VOR", description: "", validated: false }] })).toBe("cancel")
    expect(courseRemoval({ ...bare, comments: [{ id: 1 }] })).toBe("cancel")
    expect(courseRemoval({ ...bare, rating: 4 })).toBe("cancel")
  })

  it("ne propose plus rien pour un cours qui a eu lieu", () => {
    expect(courseRemoval({ ...bare, status: "COMPLETED" })).toBeNull()
    expect(courseRemoval({ ...bare, status: "IN_PROGRESS" })).toBeNull()
  })
})
