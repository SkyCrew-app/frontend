import React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import CourseDetails from "../page"
import { ADD_COMMENT, GET_COURSE_BY_ID, RATE_COURSE } from "@/graphql/course"

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "7" }),
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

const course = (overrides = {}) => ({
  id: 7,
  instructor: { id: 2, first_name: "Paul", last_name: "Durand" },
  student: { id: 5, first_name: "Léa", last_name: "Martin" },
  startTime: "2026-10-12T08:00:00.000Z",
  endTime: null,
  status: "COMPLETED",
  feedback: null,
  rating: null,
  competencies: [
    { id: 1, name: "Décollage", description: "Tenir l'axe", validated: true },
    { id: 2, name: "Atterrissage", description: "Arrondi", validated: false },
  ],
  comments: [
    { id: 1, content: "Bonne séance.", creationDate: "2026-10-12T10:00:00.000Z", author: { id: 2, first_name: "Paul" } },
  ],
  ...overrides,
})

const courseMock = (overrides = {}): MockedResponse => ({
  request: { query: GET_COURSE_BY_ID, variables: { id: 7 } },
  result: { data: { getCourseInstructionById: course(overrides) } },
})

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <CourseDetails />
    </MockedProvider>,
  )

const card = (title: string) => screen.getByText(title).closest(".rounded-xl") as HTMLElement

beforeEach(() => mockToast.mockClear())

describe("Détail d'un cours — élève", () => {
  beforeEach(() => {
    mockUser = { id: 5, role: { role_name: "Élève" } }
  })

  it("présente le cours, son statut en clair et un retour vers la liste", async () => {
    renderPage([courseMock()])

    expect(await screen.findByRole("heading", { level: 1, name: "Cours du 12 oct. 2026" })).toBeInTheDocument()
    expect(screen.getByText("Terminé")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Mes cours" })).toHaveAttribute("href", "/instruction/courses")
    expect(within(card("Informations")).getByText("Élève (vous)")).toBeInTheDocument()
    expect(within(card("Informations")).getByText("Paul Durand")).toBeInTheDocument()
  })

  it("laisse l'élève lire les compétences sans pouvoir les valider ni en ajouter", async () => {
    renderPage([courseMock()])
    await screen.findByText("Compétences")

    expect(within(card("Compétences")).getByText("1 sur 2 validée")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Valider" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ajouter" })).not.toBeInTheDocument()
  })

  it("demande une note et un retour avant d'envoyer l'avis de l'élève", async () => {
    const rate = jest.fn(() => ({ data: { rateCourseInstruction: { id: 7, feedback: "Très clair", rating: 4 } } }))
    renderPage([
      courseMock(),
      { request: { query: RATE_COURSE, variables: { id: 7, rating: 4, feedback: "Très clair" } }, result: rate },
      courseMock({ rating: 4, feedback: "Très clair" }),
    ])
    await screen.findByText("Votre avis")

    await userEvent.click(screen.getByRole("button", { name: "Envoyer l'avis" }))
    expect(screen.getByText("Choisissez une note.")).toBeInTheDocument()
    expect(screen.getByText("Écrivez quelques mots sur le cours.")).toBeInTheDocument()
    expect(rate).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("radio", { name: "4 sur 5" }))
    await userEvent.type(screen.getByLabelText(/Votre retour/), "Très clair")
    await userEvent.click(screen.getByRole("button", { name: "Envoyer l'avis" }))

    expect(await screen.findByRole("img", { name: "Note : 4 sur 5" })).toBeInTheDocument()
    expect(rate).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Très clair")).toBeInTheDocument()
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Avis enregistré" }))
  })

  it("publie un commentaire au nom de l'élève", async () => {
    const add = jest.fn(() => ({
      data: {
        addCommentToCourse: { id: 2, content: "Merci !", creationDate: "2026-10-12T11:00:00.000Z", author: { id: 5, first_name: "Léa" } },
      },
    }))
    renderPage([
      courseMock(),
      {
        request: { query: ADD_COMMENT, variables: { input: { courseId: 7, content: "Merci !", author: 5 } } },
        result: add,
      },
      courseMock(),
    ])
    await screen.findByText("Bonne séance.")
    const publish = screen.getByRole("button", { name: "Publier le commentaire" })
    expect(publish).toBeDisabled()

    await userEvent.type(screen.getByLabelText("Ajouter un commentaire"), "Merci !")
    await userEvent.click(publish)

    await waitFor(() => expect(add).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByLabelText("Ajouter un commentaire")).toHaveValue(""))
  })
})

describe("Détail d'un cours — instructeur", () => {
  beforeEach(() => {
    mockUser = { id: 2, role: { role_name: "Instructeur" } }
  })

  it("laisse l'instructeur valider et ajouter des compétences, mais pas noter son propre cours", async () => {
    renderPage([courseMock()])
    await screen.findByText("Compétences")

    expect(within(card("Compétences")).getAllByRole("button", { name: "Valider" })).toHaveLength(1)
    expect(within(card("Compétences")).getByRole("button", { name: "Ajouter" })).toBeInTheDocument()
    expect(within(card("Informations")).getByText("Instructeur (vous)")).toBeInTheDocument()
    expect(screen.getByText("L'élève n'a pas encore donné son avis.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Envoyer l'avis" })).not.toBeInTheDocument()
  })
})

describe("Détail d'un cours — introuvable", () => {
  it("l'explique sans message technique et garde le retour vers la liste", async () => {
    mockUser = { id: 5, role: { role_name: "Élève" } }
    renderPage([{ request: { query: GET_COURSE_BY_ID, variables: { id: 7 } }, error: new Error("Forbidden resource") }])

    expect(await screen.findByText("Cours introuvable")).toBeInTheDocument()
    expect(screen.queryByText(/Forbidden/)).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Mes cours" })).toBeInTheDocument()
  })
})
