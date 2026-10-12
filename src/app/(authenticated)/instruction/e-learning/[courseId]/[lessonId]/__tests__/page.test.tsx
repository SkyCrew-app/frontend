import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import LessonPage from "../page"
import { COMPLETE_LESSON, GET_COURSE_DETAILS, GET_LESSON_CONTENT, GET_LESSON_PROGRESS } from "@/graphql/instruction"

let mockParams = { courseId: "4", lessonId: "12" }
jest.mock("next/navigation", () => ({
  useParams: () => mockParams,
}))

const mockToast = jest.fn()
jest.mock("@/components/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}))

const mockUser = { id: 5 }
jest.mock("@/components/hooks/userHooks", () => ({
  useCurrentUser: () => "eleve@club.fr",
  useUserData: () => mockUser,
}))

const lesson = (id: number, title: string) => ({ id, title, description: "", video_url: null })

const courseMock: MockedResponse = {
  request: { query: GET_COURSE_DETAILS, variables: { id: 4, userId: 5 } },
  result: {
    data: {
      getCourseById: {
        id: 4,
        title: "Météorologie",
        description: "",
        category: "Théorie",
        required_license: null,
        modules: [
          {
            id: 1,
            title: "Les bases",
            description: "",
            lessons: [lesson(11, "L'atmosphère"), lesson(12, "Les fronts"), lesson(13, "Le givrage")],
            evaluations: [],
          },
        ],
      },
    },
  },
}

const lessonMock = (lessonId: number, overrides = {}): MockedResponse => ({
  request: { query: GET_LESSON_CONTENT, variables: { lessonId, userId: 5 } },
  result: {
    data: {
      getLessonContent: {
        id: lessonId,
        title: "Les fronts",
        description: "Reconnaître un front.",
        content: "<p>Un front sépare deux masses d'air.</p>",
        video_url: "https://www.youtube.com/watch?v=abc123",
        attachments: ["https://exemple.fr/docs/guide%20fronts.pdf"],
        ...overrides,
      },
    },
  },
})

const progressMock = (lessonId: number, completed: boolean): MockedResponse => ({
  request: { query: GET_LESSON_PROGRESS, variables: { lessonId, userId: 5 } },
  result: { data: { getUserProgress: completed } },
})

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <LessonPage />
    </MockedProvider>,
  )

beforeEach(() => {
  mockParams = { courseId: "4", lessonId: "12" }
  mockToast.mockClear()
})

describe("Leçon e-learning", () => {
  it("affiche la vidéo, le texte et les ressources, et situe la leçon dans le cours", async () => {
    renderPage([courseMock, lessonMock(12), progressMock(12, false)])

    expect(await screen.findByRole("heading", { level: 1, name: "Les fronts" })).toBeInTheDocument()
    expect(screen.getByText("Un front sépare deux masses d'air.")).toBeInTheDocument()
    expect(screen.getByTitle("Vidéo : Les fronts")).toHaveAttribute("src", "https://www.youtube.com/embed/abc123")
    expect(screen.getByRole("link", { name: /guide fronts\.pdf/ })).toHaveAttribute(
      "href",
      "https://exemple.fr/docs/guide%20fronts.pdf",
    )
    expect(await screen.findByText("Leçon 2 sur 3")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Météorologie" })).toHaveAttribute("href", "/instruction/e-learning/4")
  })

  it("relie la leçon à la précédente et à la suivante", async () => {
    renderPage([courseMock, lessonMock(12), progressMock(12, false)])
    await screen.findByText("Leçon 2 sur 3")

    expect(screen.getByRole("link", { name: "Leçon précédente" })).toHaveAttribute("href", "/instruction/e-learning/4/11")
    expect(screen.getByRole("link", { name: "Leçon suivante" })).toHaveAttribute("href", "/instruction/e-learning/4/13")
  })

  it("enregistre la leçon comme terminée et l'indique", async () => {
    const complete = jest.fn(() => ({ data: { completeLesson: true } }))
    renderPage([
      courseMock,
      lessonMock(12),
      progressMock(12, false),
      { request: { query: COMPLETE_LESSON, variables: { lessonId: 12, userId: 5 } }, result: complete },
      progressMock(12, true),
    ])
    await screen.findByRole("heading", { level: 1, name: "Les fronts" })
    expect(screen.queryByText("Terminée")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Marquer comme terminée" }))

    expect(await screen.findByText("Terminée")).toBeInTheDocument()
    expect(complete).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("button", { name: "Marquer comme terminée" })).not.toBeInTheDocument()
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Leçon terminée" }))
  })

  it("prévient en clair quand l'enregistrement échoue", async () => {
    renderPage([
      courseMock,
      lessonMock(12),
      progressMock(12, false),
      { request: { query: COMPLETE_LESSON, variables: { lessonId: 12, userId: 5 } }, error: new Error("boom") },
    ])
    await screen.findByRole("heading", { level: 1, name: "Les fronts" })

    await userEvent.click(screen.getByRole("button", { name: "Marquer comme terminée" }))

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Leçon non enregistrée" })),
    )
    expect(mockToast.mock.calls[0][0].description).not.toMatch(/boom/)
    expect(screen.getByRole("button", { name: "Marquer comme terminée" })).toBeEnabled()
  })

  it("ramène au cours après la dernière leçon terminée", async () => {
    mockParams = { courseId: "4", lessonId: "13" }
    renderPage([courseMock, lessonMock(13, { video_url: null, attachments: [] }), progressMock(13, true)])
    await screen.findByText("Leçon 3 sur 3")

    expect(screen.queryByRole("link", { name: "Leçon suivante" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Revenir au cours" })).toHaveAttribute("href", "/instruction/e-learning/4")
    expect(screen.queryByText("Ressources")).not.toBeInTheDocument()
  })
})
