import React from "react"
import { render, screen, within } from "@testing-library/react"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import CourseDetailPage from "../page"
import { GET_COURSE_DETAILS, GET_COURSE_PROGRESS, GET_LESSON_PROGRESS } from "@/graphql/instruction"
import { GET_USER_EVALUATION_RESULTS } from "@/graphql/evaluation"

jest.mock("next/navigation", () => ({
  useParams: () => ({ courseId: "4" }),
}))

const mockUser = { id: 5 }
jest.mock("@/components/hooks/userHooks", () => ({
  useCurrentUser: () => "eleve@club.fr",
  useUserData: () => mockUser,
}))

const lesson = (id: number, title: string) => ({ id, title, description: "", video_url: null })

const courseData = {
  id: 4,
  title: "Météorologie",
  description: "Comprendre le temps qu'il fait.",
  category: "Théorie",
  required_license: "PPL",
  modules: [
    {
      id: 1,
      title: "Les bases",
      description: "",
      lessons: [lesson(11, "L'atmosphère"), lesson(12, "Les nuages")],
      evaluations: [{ id: 30, pass_score: 70 }],
    },
    {
      id: 2,
      title: "Les fronts",
      description: "",
      lessons: [lesson(13, "Front chaud"), lesson(14, "Front froid")],
      evaluations: [{ id: 31, pass_score: 80 }],
    },
  ],
}

const lessonProgress = (lessonId: number, completed: boolean): MockedResponse => ({
  request: { query: GET_LESSON_PROGRESS, variables: { userId: 5, lessonId } },
  result: { data: { getUserProgress: completed } },
})

const mocks = (completed: number[]): MockedResponse[] => [
  { request: { query: GET_COURSE_DETAILS, variables: { id: 4, userId: 5 } }, result: { data: { getCourseById: courseData } } },
  {
    request: { query: GET_COURSE_PROGRESS, variables: { userId: 5, courseId: 4 } },
    result: { data: { getCourseProgress: (completed.length / 4) * 100 } },
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
            evaluation: { id: 30, pass_score: 70, module: { id: 1, title: "Les bases", description: null } },
          },
        ],
      },
    },
  },
  ...[11, 12, 13, 14].map((id) => lessonProgress(id, completed.includes(id))),
]

const renderPage = (completed: number[]) =>
  render(
    <MockedProvider mocks={mocks(completed)} addTypename={false}>
      <CourseDetailPage />
    </MockedProvider>,
  )

describe("Cours e-learning", () => {
  it("affiche la progression réelle et propose de continuer à la première leçon non terminée", async () => {
    renderPage([11, 12])

    const resume = await screen.findByRole("link", { name: "Continuer" })
    expect(resume).toHaveAttribute("href", "/instruction/e-learning/4/13")
    expect(screen.getByRole("heading", { level: 1, name: "Météorologie" })).toBeInTheDocument()
    expect(screen.getByText(/2 sur 4 leçons terminées/)).toBeInTheDocument()
    expect(screen.getByText("50 %")).toBeInTheDocument()
    expect(screen.getByText("Licence requise : PPL")).toBeInTheDocument()
  })

  it("ouvre le programme sur le module à reprendre et y signale la leçon à suivre", async () => {
    renderPage([11, 12])
    await screen.findByRole("link", { name: "Continuer" })

    // The finished module stays folded, the one to resume is open.
    expect(screen.getByRole("button", { name: /Les bases/ })).toHaveAttribute("aria-expanded", "false")
    expect(within(screen.getByRole("button", { name: /Les bases/ })).getByText("Terminé")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Les fronts/ })).toHaveAttribute("aria-expanded", "true")

    const next = screen.getByRole("link", { name: /1\. Front chaud/ })
    expect(next).toHaveAttribute("href", "/instruction/e-learning/4/13")
    expect(within(next).getByText("À suivre")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Passer" })).toHaveAttribute("href", "/instruction/evaluation/31")
  })

  it("propose de commencer un cours jamais ouvert, à sa première leçon", async () => {
    renderPage([])

    expect(await screen.findByRole("link", { name: "Commencer le cours" })).toHaveAttribute(
      "href",
      "/instruction/e-learning/4/11",
    )
    expect(screen.getByText(/0 sur 4 leçons terminées/)).toBeInTheDocument()
    // The evaluation already passed is shown as such, with the score.
    expect(screen.getByText("Réussie")).toBeInTheDocument()
    expect(screen.getByText(/Votre score : 90 %/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Mes résultats" })).toHaveAttribute("href", "/instruction/evaluation")
  })

  it("propose de revoir un cours entièrement terminé", async () => {
    renderPage([11, 12, 13, 14])

    expect(await screen.findByRole("link", { name: "Revoir le cours" })).toHaveAttribute(
      "href",
      "/instruction/e-learning/4/11",
    )
    expect(screen.getByText("100 %")).toBeInTheDocument()
  })
})
