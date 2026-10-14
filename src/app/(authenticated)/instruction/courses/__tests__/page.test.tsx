import React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import InstructionDashboard from "../page"
import { DELETE_COURSE, GET_COURSE_BY_USER_ID, GET_MEMBERS_DIRECTORY, UPDATE_COURSE } from "@/graphql/course"

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

  describe("un cours dont l'avion est réservé", () => {
    const booking = {
      id: 70,
      start_time: "2026-11-20T08:00:00.000Z",
      end_time: "2026-11-20T09:00:00.000Z",
      charged_amount: 165,
      aircraft: { id: 4, registration_number: "F-GBOK" },
    }
    const booked = { ...courses[1], reservation: booking }
    const directory = { request: { query: GET_MEMBERS_DIRECTORY }, result: { data: { membersDirectory: [] } } }

    const openRemoval = async (menuItem: string) => {
      await screen.findByRole("table")
      await userEvent.click(within(rows()[0]).getByRole("button", { name: "Actions du cours" }))
      await userEvent.click(await screen.findByRole("menuitem", { name: menuItem }))
      return within(await screen.findByRole("alertdialog"))
    }

    it("montre la réservation et l'annule avec le cours, remboursée, si la case reste cochée", async () => {
      const remove = jest.fn(() => ({ data: { deleteCourseInstruction: true } }))
      renderPage([
        coursesMock(2, [booked, courses[0]]),
        directory,
        { request: { query: DELETE_COURSE, variables: { id: 2, cancelBooking: true } }, result: remove },
        coursesMock(2, [courses[0]]),
      ])
      const dialog = await openRemoval("Supprimer")

      expect(dialog.getByText("Réservation de l'avion du cours")).toBeInTheDocument()
      expect(dialog.getByText(/F-GBOK · 20 nov\. 2026 ·/)).toBeInTheDocument()
      expect(dialog.getByText(/Payée par l'élève : 165,00\s€/)).toBeInTheDocument()
      const choice = dialog.getByRole("checkbox", {
        name: "Annuler aussi la réservation de l'avion et rembourser l'élève",
      })
      expect(choice).toBeChecked()

      await userEvent.click(dialog.getByRole("button", { name: "Supprimer" }))

      await waitFor(() => expect(remove).toHaveBeenCalledTimes(1))
      await waitFor(() =>
        expect(mockToast).toHaveBeenCalledWith({
          title: "Cours supprimé",
          description: "La réservation de F-GBOK est annulée et l'élève a été remboursé.",
        }),
      )
    })

    it("laisse la réservation en place, et le dit, quand la case est décochée", async () => {
      const remove = jest.fn(() => ({ data: { deleteCourseInstruction: true } }))
      renderPage([
        coursesMock(2, [booked, courses[0]]),
        directory,
        { request: { query: DELETE_COURSE, variables: { id: 2 } }, result: remove },
        coursesMock(2, [courses[0]]),
      ])
      const dialog = await openRemoval("Supprimer")

      await userEvent.click(dialog.getByRole("checkbox"))
      expect(dialog.getByText(/La réservation reste en place : l'élève la garde et reste débité/)).toBeInTheDocument()
      await userEvent.click(dialog.getByRole("button", { name: "Supprimer" }))

      await waitFor(() => expect(remove).toHaveBeenCalledTimes(1))
    })

    it("annule un cours du dossier de formation avec sa réservation", async () => {
      const withRecord = { ...booked, competencies: [{ id: 9, name: "Virages", description: "", validated: false }] }
      const update = jest.fn(() => ({
        data: {
          updateCourseInstruction: {
            id: 2,
            startTime: withRecord.startTime,
            endTime: null,
            instructor: { id: 2, first_name: "Paul" },
          },
        },
      }))
      renderPage([
        coursesMock(2, [withRecord, courses[0]]),
        directory,
        {
          request: { query: UPDATE_COURSE, variables: { input: { id: 2, status: "CANCELED", cancelBooking: true } } },
          result: update,
        },
        coursesMock(2, [courses[0]]),
      ])
      const dialog = await openRemoval("Annuler le cours")
      expect(dialog.getByRole("checkbox")).toBeChecked()

      await userEvent.click(dialog.getByRole("button", { name: "Annuler le cours" }))

      await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    })

    it("ne propose pas d'annuler une réservation dont le vol a commencé, et dit pourquoi", async () => {
      const started = {
        ...booked,
        reservation: { ...booking, start_time: "2026-01-05T08:00:00.000Z", end_time: "2026-01-05T09:00:00.000Z" },
      }
      renderPage([coursesMock(2, [started, courses[0]]), directory])
      const dialog = await openRemoval("Supprimer")

      expect(dialog.queryByRole("checkbox")).not.toBeInTheDocument()
      expect(dialog.getByText(/Le vol a commencé : seul un administrateur peut encore annuler la réservation/)).toBeInTheDocument()
    })
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
