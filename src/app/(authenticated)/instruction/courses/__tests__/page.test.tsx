import React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import InstructionDashboard from "../page"
import { DELETE_COURSE, GET_COURSE_BY_USER_ID, GET_MEMBERS_DIRECTORY } from "@/graphql/course"

const mockPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockToast = jest.fn()
jest.mock("@/components/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}))

let mockUser: { id: number; role: { role_name: string } }
jest.mock("@/components/hooks/userHooks", () => ({
  useCurrentUser: () => "membre@club.fr",
  useUserData: () => mockUser,
}))

const paul = { id: 2, first_name: "Paul", last_name: "Durand" }
const lea = { id: 5, first_name: "Léa", last_name: "Martin" }
const marc = { id: 8, first_name: "Marc", last_name: "Petit" }

const course = (id: number, instructor: typeof paul, student: typeof paul, startTime: string, status: string) => ({
  id,
  instructor,
  student,
  startTime,
  endTime: null,
  status,
  feedback: null,
  rating: id === 1 ? 4 : null,
  competencies:
    id === 1
      ? [
          { id: 1, name: "Décollage", description: "", validated: true },
          { id: 2, name: "Atterrissage", description: "", validated: false },
        ]
      : [],
  comments: [],
})

const courses = [
  course(1, paul, lea, "2026-09-10T08:00:00.000Z", "COMPLETED"),
  course(2, paul, marc, "2026-11-20T08:00:00.000Z", "SCHEDULED"),
  // A course the instructor takes as a student.
  course(3, marc, paul, "2026-10-01T08:00:00.000Z", "CANCELED"),
]

const coursesMock = (userId: number, list = courses): MockedResponse => ({
  request: { query: GET_COURSE_BY_USER_ID, variables: { userId } },
  result: { data: { getCoursesByUserId: list } },
})

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <InstructionDashboard />
    </MockedProvider>,
  )

const rows = () => screen.getAllByRole("row").slice(1)

beforeAll(() => {
  // Radix menus rely on APIs jsdom does not have.
  Element.prototype.hasPointerCapture = jest.fn(() => false)
  Element.prototype.setPointerCapture = jest.fn()
  Element.prototype.releasePointerCapture = jest.fn()
  Element.prototype.scrollIntoView = jest.fn()
})

beforeEach(() => {
  mockPush.mockClear()
  mockToast.mockClear()
})

describe("Mes cours — instructeur", () => {
  beforeEach(() => {
    mockUser = { id: 2, role: { role_name: "Instructeur" } }
  })

  it("liste les cours du plus récent au plus ancien, avec des en-têtes en clair et le rôle de l'autre personne", async () => {
    renderPage([coursesMock(2)])
    await screen.findByRole("table")

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Date",
      "Horaire",
      "Avec",
      "Statut",
      "Compétences validées",
      "Note",
      "Actions",
    ])

    expect(within(rows()[0]).getByText("Marc Petit")).toBeInTheDocument()
    expect(within(rows()[0]).getByText("Élève")).toBeInTheDocument()
    expect(within(rows()[0]).getByText("Planifié")).toBeInTheDocument()
    // The instructor is the student of this one.
    expect(within(rows()[1]).getByText("Instructeur")).toBeInTheDocument()
    expect(within(rows()[1]).getByText("Annulé")).toBeInTheDocument()
    expect(within(rows()[2]).getByText("Léa Martin")).toBeInTheDocument()
    expect(within(rows()[2]).getByText("1 / 2")).toBeInTheDocument()
    expect(within(rows()[2]).getByText("4 / 5")).toBeInTheDocument()
    expect(screen.queryByText(/CANCELED|SCHEDULED|COMPLETED/)).not.toBeInTheDocument()
  })

  it("ouvre le détail d'un cours au clic sur sa ligne", async () => {
    renderPage([coursesMock(2)])
    await screen.findByRole("table")

    await userEvent.click(within(rows()[2]).getByText("Léa Martin"))

    expect(mockPush).toHaveBeenCalledWith("/instruction/courses/1")
  })

  it("ne propose de modifier que les cours donnés par l'instructeur", async () => {
    renderPage([coursesMock(2)])
    await screen.findByRole("table")

    expect(within(rows()[0]).getByRole("button", { name: "Actions du cours" })).toBeInTheDocument()
    expect(within(rows()[1]).queryByRole("button", { name: "Actions du cours" })).not.toBeInTheDocument()
    expect(within(rows()[1]).getByRole("link", { name: "Ouvrir le cours" })).toHaveAttribute(
      "href",
      "/instruction/courses/3",
    )
  })

  it("filtre par statut et par personne", async () => {
    renderPage([coursesMock(2)])
    await screen.findByRole("table")

    await userEvent.type(screen.getByRole("searchbox"), "léa")
    expect(rows()).toHaveLength(1)

    await userEvent.clear(screen.getByRole("searchbox"))
    await userEvent.click(screen.getByRole("combobox", { name: "Filtrer par statut" }))
    await userEvent.click(await screen.findByRole("option", { name: "Annulé" }))
    expect(rows()).toHaveLength(1)
    expect(within(rows()[0]).getByText("Marc Petit")).toBeInTheDocument()
  })

  it("supprime un cours après une confirmation qui le nomme, puis recharge la liste", async () => {
    const remove = jest.fn(() => ({ data: { deleteCourseInstruction: true } }))
    renderPage([
      coursesMock(2),
      { request: { query: GET_MEMBERS_DIRECTORY }, result: { data: { membersDirectory: [] } } },
      { request: { query: DELETE_COURSE, variables: { id: 2 } }, result: remove },
      coursesMock(2, [courses[0], courses[2]]),
    ])
    await screen.findByRole("table")

    await userEvent.click(within(rows()[0]).getByRole("button", { name: "Actions du cours" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Supprimer" }))

    expect(remove).not.toHaveBeenCalled()
    expect(await screen.findByText(/Le cours du 20 nov\. 2026 avec Marc Petit sera définitivement supprimé/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }))

    await waitFor(() => expect(rows()).toHaveLength(2))
    expect(remove).toHaveBeenCalledTimes(1)
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Cours supprimé" }))
  })

  it("propose de planifier un cours", async () => {
    renderPage([coursesMock(2)])
    await screen.findByRole("table")

    expect(screen.getByRole("button", { name: "Planifier un cours" })).toBeInTheDocument()
  })
})

describe("Mes cours — élève", () => {
  beforeEach(() => {
    mockUser = { id: 5, role: { role_name: "Élève" } }
  })

  it("montre l'instructeur de chaque cours et ne propose ni de planifier ni de modifier", async () => {
    renderPage([coursesMock(5, [courses[0]])])
    await screen.findByRole("table")

    expect(within(rows()[0]).getByText("Paul Durand")).toBeInTheDocument()
    expect(within(rows()[0]).getByText("Instructeur")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Planifier un cours" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Actions du cours" })).not.toBeInTheDocument()
  })

  it("explique la liste vide sans proposer de créer", async () => {
    renderPage([coursesMock(5, [])])

    expect(await screen.findByText("Aucun cours pour le moment")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "Mes cours" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Planifier un cours" })).not.toBeInTheDocument()
  })
})
