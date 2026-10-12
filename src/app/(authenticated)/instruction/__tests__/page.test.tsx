import React from "react"
import { render, screen, within } from "@testing-library/react"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import InstructionHome from "../page"
import { GET_COURSE_BY_USER_ID } from "@/graphql/course"
import { GET_EVALUATIONS, GET_USER_EVALUATION_RESULTS, GET_USER_INSTRUCTION_SUMMARY } from "@/graphql/evaluation"

const mockUser = { id: 5 }
jest.mock("@/components/hooks/userHooks", () => ({
  useCurrentUser: () => "eleve@club.fr",
  useUserData: () => mockUser,
}))

const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

const course = (id: number, startTime: string, status: string) => ({
  id,
  instructor: { id: 2, first_name: "Paul", last_name: "Durand" },
  student: { id: 5, first_name: "Léa", last_name: "Martin" },
  startTime,
  endTime: null,
  status,
  feedback: null,
  rating: null,
  competencies: [],
  comments: [],
})

const summary = {
  upcomingCourses: [],
  recentCourses: [],
  learningProgress: { completedCourses: 0, totalCourses: 0, completedLessons: 0, totalLessons: 0 },
  evaluations: { completed: 0, upcoming: 0, averageScore: 0 },
  eLearningCourses: [
    { id: "1", title: "Météorologie", category: "Théorie", progress: 50, completedLessons: 2, totalLessons: 4, lastAccessedDate: null },
    { id: "2", title: "Navigation", category: "Théorie", progress: 0, completedLessons: 0, totalLessons: 6, lastAccessedDate: null },
  ],
}

const mocks = (overrides: Partial<Record<"summary" | "courses", MockedResponse>> = {}): MockedResponse[] => [
  overrides.summary ?? {
    request: { query: GET_USER_INSTRUCTION_SUMMARY, variables: { userId: 5 } },
    result: { data: { getUserInstructionSummary: summary } },
  },
  overrides.courses ?? {
    request: { query: GET_COURSE_BY_USER_ID, variables: { userId: 5 } },
    result: {
      data: {
        getCoursesByUserId: [
          course(1, inDays(10), "SCHEDULED"),
          course(2, inDays(2), "SCHEDULED"),
          course(3, inDays(-5), "COMPLETED"),
          course(4, inDays(3), "CANCELED"),
        ],
      },
    },
  },
  {
    request: { query: GET_EVALUATIONS },
    result: {
      data: {
        getEvaluations: [
          { id: 10, module: { id: 1, title: "Les fronts" }, pass_score: 70 },
          { id: 11, module: { id: 2, title: "Altimétrie" }, pass_score: 80 },
          { id: 12, module: { id: 3, title: "Réglementation" }, pass_score: 75 },
        ],
      },
    },
  },
  {
    request: { query: GET_USER_EVALUATION_RESULTS, variables: { userId: 5 } },
    result: {
      data: {
        getUserEvaluationResults: [
          {
            id: 1,
            score: 90,
            passed: true,
            completed_at: "2026-09-01T10:00:00Z",
            evaluation: { id: 10, pass_score: 70, module: { id: 1, title: "Les fronts", description: null } },
          },
          {
            id: 2,
            score: 50,
            passed: false,
            completed_at: "2026-09-02T10:00:00Z",
            evaluation: { id: 11, pass_score: 80, module: { id: 2, title: "Altimétrie", description: null } },
          },
        ],
      },
    },
  },
]

const renderPage = (responses = mocks()) =>
  render(
    <MockedProvider mocks={responses} addTypename={false}>
      <InstructionHome />
    </MockedProvider>,
  )

// "Évaluations à passer" names both a key figure and the list under it.
const card = (title: string, position: "first" | "last" = "first") => {
  const matches = screen.getAllByText(title)
  return (position === "first" ? matches[0] : matches[matches.length - 1]).closest(".rounded-xl") as HTMLElement
}

describe("Centre d'instruction", () => {
  it("ne répète pas la navigation du menu : ni onglets ni boutons vers les sous-pages dans l'en-tête", async () => {
    renderPage()
    await screen.findByText("Prochains cours")

    expect(screen.getByRole("heading", { level: 1, name: "Centre d'instruction" })).toBeInTheDocument()
    expect(screen.queryByRole("tab")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Mes cours/i })).not.toBeInTheDocument()
  })

  it("résume la progression réelle en chiffres", async () => {
    renderPage()
    await screen.findByText("Prochains cours")

    expect(within(card("Leçons terminées")).getByText("2 / 10")).toBeInTheDocument()
    expect(within(card("Leçons terminées")).getByText("20 % des cours en ligne")).toBeInTheDocument()
    expect(within(card("Cours à venir")).getByText("2")).toBeInTheDocument()
    expect(within(card("Évaluations à passer")).getByText("2")).toBeInTheDocument()
    expect(within(card("Évaluations à passer")).getByText("1 réussie")).toBeInTheDocument()
    expect(within(card("Score moyen")).getByText("70 %")).toBeInTheDocument()
  })

  it("liste les cours à venir du plus proche au plus lointain, avec un lien vers chacun", async () => {
    renderPage()
    await screen.findByText("Prochains cours")

    const links = within(card("Prochains cours")).getAllByRole("link")
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/instruction/courses",
      "/instruction/courses/2",
      "/instruction/courses/1",
    ])
    expect(within(card("Prochains cours")).getAllByText("Instructeur : Paul Durand")).toHaveLength(2)
    expect(within(card("Prochains cours")).queryByText("Annulé")).not.toBeInTheDocument()
  })

  it("met en avant le cours en ligne commencé et mène à chaque cours", async () => {
    renderPage()
    await screen.findByText("Prochains cours")

    const links = within(card("E-learning")).getAllByRole("link")
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/instruction/e-learning",
      "/instruction/e-learning/1",
      "/instruction/e-learning/2",
    ])
    expect(within(card("E-learning")).getByText("2 / 4 leçons")).toBeInTheDocument()
  })

  it("propose de passer les évaluations non réussies, pas celles déjà réussies", async () => {
    renderPage()
    await screen.findByText("Prochains cours")

    const evaluations = within(card("Évaluations à passer", "last"))
    expect(evaluations.queryByText("Les fronts")).not.toBeInTheDocument()
    expect(evaluations.getByRole("link", { name: "Repasser" })).toHaveAttribute("href", "/instruction/evaluation/11")
    expect(evaluations.getByRole("link", { name: "Passer" })).toHaveAttribute("href", "/instruction/evaluation/12")
    expect(evaluations.getByText("À repasser")).toBeInTheDocument()
  })

  it("propose de réessayer quand la synthèse ne se charge pas, sans afficher le message technique", async () => {
    renderPage(
      mocks({
        summary: {
          request: { query: GET_USER_INSTRUCTION_SUMMARY, variables: { userId: 5 } },
          error: new Error("ECONNREFUSED"),
        },
      }),
    )

    expect(await screen.findByRole("button", { name: /Réessayer/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "Centre d'instruction" })).toBeInTheDocument()
    expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument()
  })
})
