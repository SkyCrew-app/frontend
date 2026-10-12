import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import { QuestionsDialog, type AdminEvaluation } from "../QuestionsDialog"
import { CREATE_QUESTION, DELETE_QUESTION } from "@/graphql/learningAdmin"

const mockToast = jest.fn()
jest.mock("@/components/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}))

const evaluation: AdminEvaluation = {
  id: 7,
  pass_score: 70,
  module: { id: 3, title: "Météorologie" },
  questions: [
    { id: 11, content: { text: "Que signifie CAVOK ?" }, options: ["Ciel clair", "Orage"], correct_answer: "Ciel clair" },
  ],
}

const renderDialog = (mocks: MockedResponse[] = [], onChanged = jest.fn()) => {
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <QuestionsDialog evaluation={evaluation} onClose={jest.fn()} onChanged={onChanged} />
    </MockedProvider>,
  )
  return { onChanged }
}

beforeEach(() => mockToast.mockClear())

describe("QuestionsDialog", () => {
  it("liste les questions et signale la bonne réponse", () => {
    renderDialog()

    expect(screen.getByText("Que signifie CAVOK ?")).toBeInTheDocument()
    expect(screen.getByLabelText("Bonne réponse").closest("li")).toHaveTextContent("Ciel clair")
    expect(screen.getByText(/score de réussite : 70 % · 1 question$/)).toBeInTheDocument()
  })

  it("explique sous le champ ce qui manque avant d'ajouter une question", async () => {
    renderDialog()
    await userEvent.click(screen.getByRole("button", { name: "Ajouter une question" }))
    await userEvent.click(screen.getByRole("button", { name: "Ajouter la question" }))

    expect(screen.getByText("Écrivez la question.")).toBeInTheDocument()
    expect(screen.getByText("Remplissez chaque réponse, ou supprimez celles qui sont vides.")).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/^Question/), "Quel vent ?")
    await userEvent.type(screen.getByLabelText("Réponse 1"), "Nord")
    await userEvent.type(screen.getByLabelText("Réponse 2"), "Nord")
    expect(screen.getByText("Deux réponses sont identiques : chaque réponse doit être différente.")).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText("Réponse 2"), "-Est")
    expect(screen.getByText("Cochez la bonne réponse.")).toBeInTheDocument()
    expect(mockToast).not.toHaveBeenCalled()
  })

  it("envoie la question avec la réponse cochée comme bonne réponse", async () => {
    const result = jest.fn(() => ({
      data: { createQuestion: { id: 12, content: { text: "Quel vent ?" }, options: ["Nord", "Sud"], correct_answer: "Sud" } },
    }))
    const { onChanged } = renderDialog([
      {
        request: {
          query: CREATE_QUESTION,
          variables: {
            evaluationId: 7,
            createQuestionInput: { content: { text: "Quel vent ?" }, options: ["Nord", "Sud"], correct_answer: "Sud" },
          },
        },
        result,
      },
    ])

    await userEvent.click(screen.getByRole("button", { name: "Ajouter une question" }))
    await userEvent.type(screen.getByLabelText(/^Question/), "Quel vent ?")
    await userEvent.type(screen.getByLabelText("Réponse 1"), "Nord")
    await userEvent.type(screen.getByLabelText("Réponse 2"), "Sud")
    await userEvent.click(screen.getByLabelText("La réponse 2 est la bonne"))
    await userEvent.click(screen.getByRole("button", { name: "Ajouter la question" }))

    await waitFor(() => expect(result).toHaveBeenCalled())
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    // Back on the list once the question is saved.
    expect(await screen.findByRole("button", { name: "Ajouter une question" })).toBeInTheDocument()
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Question ajoutée" }))
  })

  it("demande confirmation, en citant la question, avant de la supprimer", async () => {
    const result = jest.fn(() => ({ data: { deleteQuestion: true } }))
    const { onChanged } = renderDialog([{ request: { query: DELETE_QUESTION, variables: { id: 11 } }, result }])

    await userEvent.click(screen.getByRole("button", { name: "Supprimer la question 1" }))
    expect(result).not.toHaveBeenCalled()
    expect(screen.getByText(/La question « Que signifie CAVOK \? » sera définitivement supprimée/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }))

    await waitFor(() => expect(result).toHaveBeenCalled())
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })
})
