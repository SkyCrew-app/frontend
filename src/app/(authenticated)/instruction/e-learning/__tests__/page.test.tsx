import React from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider } from "@apollo/client/testing"
import ELearningPage from "../page"
import { GET_USER_INSTRUCTION_SUMMARY } from "@/graphql/evaluation"
import { GET_COURSES } from "@/graphql/learningAdmin"

const mockUser = { id: 5, role: { role_name: "Élève" } }
jest.mock("@/components/hooks/userHooks", () => ({
  useCurrentUser: () => "eleve@club.fr",
  useUserData: () => mockUser,
}))

const courses = [
  { id: 1, title: "Navigation", description: "Préparer une navigation.", category: "Théorie", required_license: "PPL" },
  { id: 2, title: "Météorologie", description: "Lire une TEMSI.", category: "Théorie", required_license: null },
  { id: 3, title: "Radio", description: null, category: "Pratique", required_license: null },
]

const progress = (id: string, completedLessons: number, totalLessons: number) => ({
  id,
  title: "",
  category: "",
  progress: 0,
  completedLessons,
  totalLessons,
  lastAccessedDate: null,
})

const mocks = [
  { request: { query: GET_COURSES }, result: { data: { getCourses: courses } } },
  {
    request: { query: GET_USER_INSTRUCTION_SUMMARY, variables: { userId: 5 } },
    result: {
      data: {
        getUserInstructionSummary: {
          upcomingCourses: [],
          recentCourses: [],
          learningProgress: { completedCourses: 0, totalCourses: 0, completedLessons: 0, totalLessons: 0 },
          evaluations: { completed: 0, upcoming: 0, averageScore: 0 },
          eLearningCourses: [progress("1", 4, 4), progress("2", 1, 4), progress("3", 0, 2)],
        },
      },
    },
  },
]

const renderPage = () =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <ELearningPage />
    </MockedProvider>,
  )

const courseLinks = () => screen.getAllByRole("link").filter((link) => /\/e-learning\/\d+$/.test(link.getAttribute("href") ?? ""))

describe("Catalogue e-learning", () => {
  it("présente les cours en cartes, le cours commencé en premier, avec la progression réelle", async () => {
    renderPage()
    await screen.findByText("Météorologie")
    await screen.findByText("1 / 4 leçons")

    expect(screen.getByRole("heading", { level: 1, name: "E-learning" })).toBeInTheDocument()
    expect(courseLinks().map((link) => link.getAttribute("href"))).toEqual([
      "/instruction/e-learning/2",
      "/instruction/e-learning/3",
      "/instruction/e-learning/1",
    ])

    const started = within(courseLinks()[0])
    expect(started.getByText("En cours")).toBeInTheDocument()
    expect(started.getByText("25 %")).toBeInTheDocument()
    expect(started.getByText("Continuer")).toBeInTheDocument()

    expect(within(courseLinks()[1]).getByText("Commencer")).toBeInTheDocument()
    expect(within(courseLinks()[2]).getByText("Terminé")).toBeInTheDocument()
    expect(within(courseLinks()[2]).getByText("Théorie · Licence PPL")).toBeInTheDocument()
  })

  it("filtre les cours par la recherche et permet de l'effacer", async () => {
    renderPage()
    await screen.findByText("Météorologie")

    await userEvent.type(screen.getByRole("searchbox"), "temsi")
    expect(courseLinks()).toHaveLength(1)

    await userEvent.clear(screen.getByRole("searchbox"))
    await userEvent.type(screen.getByRole("searchbox"), "zzz")
    expect(screen.getByText("Aucun cours ne correspond")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Effacer les filtres" }))
    expect(courseLinks()).toHaveLength(3)
  })

  it("ne montre pas la gestion des cours à un membre qui n'est pas administrateur", async () => {
    renderPage()
    await screen.findByText("Météorologie")

    expect(screen.queryByRole("link", { name: /Gérer les cours/ })).not.toBeInTheDocument()
  })
})
