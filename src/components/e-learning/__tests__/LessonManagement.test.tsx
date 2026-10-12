import React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import { GET_LESSONS_FOR_EDITING, LessonManagement } from "../LessonManagement"
import { GET_COURSES, GET_MODULES_BY_COURSE, UPDATE_LESSON } from "@/graphql/learningAdmin"

const mockToast = jest.fn()
jest.mock("@/components/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}))

// The rich-text editor does not run in jsdom: a plain field stands in for it.
jest.mock("@/components/ui/wysiwyg-editor", () => ({
  WysiwygEditor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea aria-label="Contenu de la leçon" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}))

const lessons = [
  {
    id: 21,
    title: "Lire un METAR",
    description: "Décoder le message.",
    content: "<p>Le METAR est un message d'observation.</p>",
    video_url: "https://www.youtube.com/watch?v=abc",
    attachments: ["https://exemple.fr/metar.pdf"],
  },
  {
    id: 22,
    title: "Lire un TAF",
    description: null,
    content: { title: "TAF", sections: [{ heading: "Principe", body: "Une prévision." }] },
    video_url: null,
    attachments: [],
  },
]

const baseMocks = (): MockedResponse[] => [
  {
    request: { query: GET_COURSES },
    result: {
      data: {
        getCourses: [{ id: 1, title: "Météorologie", description: "", category: "Théorie", required_license: null }],
      },
    },
  },
  {
    request: { query: GET_MODULES_BY_COURSE, variables: { courseId: 1 } },
    result: { data: { getModulesByCourse: [{ id: 3, title: "Les messages", description: "" }] } },
  },
]

const lessonsMock = (): MockedResponse => ({
  request: { query: GET_LESSONS_FOR_EDITING, variables: { moduleId: 3 } },
  result: { data: { getLessonsByModule: lessons } },
})

const renderComponent = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <LessonManagement />
    </MockedProvider>,
  )

beforeEach(() => mockToast.mockClear())

describe("LessonManagement", () => {
  it("ouvre directement le premier cours et son premier module, et liste leurs leçons", async () => {
    renderComponent([...baseMocks(), lessonsMock()])

    expect(await screen.findByText("Lire un METAR")).toBeInTheDocument()
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "N°",
      "Leçon",
      "Vidéo",
      "Pièces jointes",
      "Actions",
    ])
    const metar = screen.getByText("Lire un METAR").closest("tr") as HTMLElement
    expect(within(metar).getByText("Vidéo")).toBeInTheDocument()
    // Its rank in the module, and its one attachment.
    expect(within(metar).getAllByText("1")).toHaveLength(2)
  })

  it("ouvre la modification sur le texte publié de la leçon et l'enregistre avec ses autres champs", async () => {
    const update = jest.fn(() => ({
      data: {
        updateLesson: { ...lessons[0], title: "Lire un METAR", module: { id: 3, title: "Les messages" } },
      },
    }))
    renderComponent([
      ...baseMocks(),
      lessonsMock(),
      {
        request: {
          query: UPDATE_LESSON,
          variables: {
            id: 21,
            updateLessonInput: {
              title: "Lire un METAR",
              description: "Décoder le message.",
              content: "<p>Le METAR est un message d'observation.</p><p>Suite.</p>",
              video_url: "https://www.youtube.com/watch?v=abc",
              attachments: ["https://exemple.fr/metar.pdf"],
            },
          },
        },
        result: update,
      },
      lessonsMock(),
    ])
    await screen.findByText("Lire un METAR")

    await userEvent.click(screen.getByRole("button", { name: "Modifier la leçon Lire un METAR" }))
    const dialog = await screen.findByRole("dialog")
    // Step 1 opens on the published fields; the text is on step 2.
    expect(within(dialog).getByLabelText(/^Titre/)).toHaveValue("Lire un METAR")
    await userEvent.click(within(dialog).getByRole("button", { name: "Suivant" }))
    const editor = within(dialog).getByLabelText("Contenu de la leçon")
    expect(editor).toHaveValue("<p>Le METAR est un message d'observation.</p>")

    await userEvent.type(editor, "<p>Suite.</p>")
    await userEvent.click(within(dialog).getByRole("button", { name: "Suivant" }))
    await userEvent.click(within(dialog).getByRole("button", { name: "Enregistrer" }))

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Leçon modifiée" }))
  })

  it("ouvre aussi une leçon écrite en sections, convertie en texte modifiable", async () => {
    renderComponent([...baseMocks(), lessonsMock()])
    await screen.findByText("Lire un TAF")

    await userEvent.click(screen.getByRole("button", { name: "Modifier la leçon Lire un TAF" }))
    const dialog = await screen.findByRole("dialog")

    expect(within(dialog).getByLabelText("Contenu de la leçon")).toHaveValue("<h3>Principe</h3><p>Une prévision.</p>")
  })

  it("refuse une leçon sans texte ou avec un lien de vidéo incomplet, en l'expliquant sous les champs", async () => {
    renderComponent([...baseMocks(), lessonsMock()])
    await screen.findByText("Lire un METAR")

    await userEvent.click(screen.getByRole("button", { name: "Créer une leçon" }))
    const dialog = await screen.findByRole("dialog")
    await userEvent.type(within(dialog).getByLabelText(/^Vidéo/), "youtube.com/abc")
    await userEvent.click(within(dialog).getByRole("button", { name: "Suivant" }))

    // The first step keeps the user until its fields are right.
    expect(within(dialog).getByText("Donnez un titre à la leçon.")).toBeVisible()
    expect(within(dialog).getByText(/Collez l'adresse complète de la vidéo/)).toBeVisible()
    expect(within(dialog).getByLabelText(/^Titre/)).toBeVisible()

    await userEvent.type(within(dialog).getByLabelText(/^Titre/), "Lire un SIGMET")
    await userEvent.clear(within(dialog).getByLabelText(/^Vidéo/))
    await userEvent.click(within(dialog).getByRole("button", { name: "Suivant" }))
    expect(within(dialog).getByLabelText("Contenu de la leçon")).toBeVisible()

    // So does the second one: a lesson needs its text.
    await userEvent.click(within(dialog).getByRole("button", { name: "Suivant" }))
    expect(within(dialog).getByText("Rédigez le contenu de la leçon.")).toBeVisible()
    expect(within(dialog).queryByRole("button", { name: "Créer la leçon" })).not.toBeInTheDocument()
    expect(mockToast).not.toHaveBeenCalled()
  })
})
