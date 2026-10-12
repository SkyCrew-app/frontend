import React, { Suspense } from "react"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import EvaluationPage from "../page"
import { GET_EVALUATION_BY_ID, VALIDATE_ANSWERS } from "@/graphql/evaluation"

const mockPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock("canvas-confetti", () => jest.fn())

const mockToast = jest.fn()
jest.mock("@/components/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}))

const mockUser = { id: 5 }
jest.mock("@/components/hooks/userHooks", () => ({
  useCurrentUser: () => "eleve@club.fr",
  useUserData: () => mockUser,
}))

const evaluation = {
  id: 9,
  module: { id: 3, title: "Météorologie" },
  pass_score: 70,
  questions: [
    { id: 101, content: { text: "Que signifie CAVOK ?" }, options: ["Ciel clair", "Orage"] },
    { id: 205, content: { text: "D'où vient le mistral ?" }, options: ["Du nord", "Du sud"] },
  ],
}

const evaluationMock = (questions = evaluation.questions): MockedResponse => ({
  request: { query: GET_EVALUATION_BY_ID, variables: { id: 9 } },
  result: { data: { getEvaluationById: { ...evaluation, questions } } },
})

const renderPage = async (mocks: MockedResponse[]) => {
  await act(async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <Suspense fallback={null}>
          <EvaluationPage params={Promise.resolve({ id: "9" })} />
        </Suspense>
      </MockedProvider>,
    )
  })
  await screen.findByRole("heading", { name: "Évaluation : Météorologie" })
}

beforeEach(() => {
  mockPush.mockClear()
  mockToast.mockClear()
})

describe("Passer une évaluation", () => {
  it("affiche la première question et le score requis", async () => {
    await renderPage([evaluationMock()])

    expect(screen.getByText("Score requis : 70 % · 2 questions")).toBeInTheDocument()
    expect(screen.getByText("Question 1 sur 2")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Que signifie CAVOK ?" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Précédente" })).toBeDisabled()
  })

  it("marque comme répondue la question à laquelle on vient de répondre, pas une autre", async () => {
    await renderPage([evaluationMock()])

    await userEvent.click(screen.getByRole("radio", { name: "Ciel clair" }))

    expect(screen.getByRole("radio", { name: "Ciel clair" })).toBeChecked()
    expect(screen.getByRole("button", { name: "Question 1, répondue" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Question 2, sans réponse" })).toBeInTheDocument()
    expect(screen.getByText("Réponses données : 1 sur 2")).toBeInTheDocument()
  })

  it("refuse de terminer tant qu'une question est sans réponse et y conduit", async () => {
    await renderPage([evaluationMock()])

    await userEvent.click(screen.getByRole("button", { name: "Suivante" }))
    await userEvent.click(screen.getByRole("radio", { name: "Du nord" }))
    await userEvent.click(screen.getByRole("button", { name: "Terminer l'évaluation" }))

    expect(screen.getByText("Il reste une question sans réponse")).toBeInTheDocument()
    expect(screen.queryByText("Envoyer vos réponses ?")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Question 1" }))
    expect(screen.getByRole("heading", { name: "Que signifie CAVOK ?" })).toBeInTheDocument()
  })

  it("demande confirmation, envoie les réponses puis affiche le résultat", async () => {
    const validate = jest.fn(() => ({ data: { validateAnswers: { score: 100, passed: true } } }))
    await renderPage([
      evaluationMock(),
      {
        request: {
          query: VALIDATE_ANSWERS,
          variables: {
            evaluationId: 9,
            userId: 5,
            userAnswers: [
              { questionId: 101, answer: "Ciel clair" },
              { questionId: 205, answer: "Du nord" },
            ],
          },
        },
        result: validate,
      },
    ])

    await userEvent.click(screen.getByRole("radio", { name: "Ciel clair" }))
    await userEvent.click(screen.getByRole("button", { name: "Suivante" }))
    await userEvent.click(screen.getByRole("radio", { name: "Du nord" }))
    await userEvent.click(screen.getByRole("button", { name: "Terminer l'évaluation" }))

    // Nothing is sent before the confirmation.
    expect(screen.getByText("Envoyer vos réponses ?")).toBeInTheDocument()
    expect(validate).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Envoyer mes réponses" }))

    expect(await screen.findByRole("heading", { name: "Évaluation réussie" })).toBeInTheDocument()
    expect(validate).toHaveBeenCalledTimes(1)
    expect(screen.getByText("100 %")).toBeInTheDocument()
    expect(screen.getByText("Score requis : 70 %")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Voir mes évaluations" }))
    expect(mockPush).toHaveBeenCalledWith("/instruction/evaluation")
  })

  it("garde les réponses et prévient quand l'envoi échoue", async () => {
    await renderPage([
      evaluationMock([evaluation.questions[0]]),
      {
        request: {
          query: VALIDATE_ANSWERS,
          variables: { evaluationId: 9, userId: 5, userAnswers: [{ questionId: 101, answer: "Orage" }] },
        },
        error: new Error("boom"),
      },
    ])

    await userEvent.click(screen.getByRole("radio", { name: "Orage" }))
    await userEvent.click(screen.getByRole("button", { name: "Terminer l'évaluation" }))
    await userEvent.click(screen.getByRole("button", { name: "Envoyer mes réponses" }))

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Réponses non envoyées" })),
    )
    expect(screen.getByRole("radio", { name: "Orage" })).toBeChecked()
    expect(mockToast.mock.calls[0][0].description).not.toMatch(/boom/)
  })

  it("explique qu'une évaluation sans question ne peut pas être passée", async () => {
    await renderPage([evaluationMock([])])

    expect(screen.getByText("Cette évaluation n'a pas encore de question")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Terminer l'évaluation" })).not.toBeInTheDocument()
  })
})
