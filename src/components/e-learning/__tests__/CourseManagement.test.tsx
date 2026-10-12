import React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import { CourseManagement } from "../CourseManagement"
import { CREATE_COURSE, DELETE_COURSE, GET_COURSES, UPDATE_COURSE } from "@/graphql/learningAdmin"

const mockToast = jest.fn()
jest.mock("@/components/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}))

const courses = [
  { id: 1, title: "Navigation", description: "Préparer une navigation.", category: "Théorie", required_license: "PPL" },
  { id: 2, title: "Radio", description: null, category: null, required_license: null },
]

const listMock = (list = courses): MockedResponse => ({
  request: { query: GET_COURSES },
  result: { data: { getCourses: list } },
})

const renderComponent = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <CourseManagement />
    </MockedProvider>,
  )

beforeAll(() => {
  // Radix Select relies on APIs jsdom does not have.
  Element.prototype.hasPointerCapture = jest.fn(() => false)
  Element.prototype.setPointerCapture = jest.fn()
  Element.prototype.releasePointerCapture = jest.fn()
  Element.prototype.scrollIntoView = jest.fn()
})

beforeEach(() => mockToast.mockClear())

describe("CourseManagement", () => {
  it("liste les cours dans un tableau, les valeurs absentes en tiret", async () => {
    renderComponent([listMock()])
    await screen.findByRole("table")

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Cours",
      "Catégorie",
      "Licence requise",
      "Actions",
    ])
    const radio = screen.getByText("Radio").closest("tr") as HTMLElement
    expect(within(radio).getAllByText("—")).toHaveLength(2)
  })

  it("crée un cours sans licence requise en envoyant une licence vide, pas le libellé du menu", async () => {
    const create = jest.fn(() => ({
      data: { createCourse: { id: 3, title: "Météo", description: "", category: "", required_license: null } },
    }))
    renderComponent([
      listMock(),
      {
        request: {
          query: CREATE_COURSE,
          variables: { createCourseInput: { title: "Météo", description: "", category: "", required_license: null } },
        },
        result: create,
      },
      listMock(),
    ])
    await screen.findByRole("table")

    await userEvent.click(screen.getByRole("button", { name: "Créer un cours" }))
    const dialog = await screen.findByRole("dialog")

    // The title is required: the reason is written under the field.
    await userEvent.click(within(dialog).getByRole("button", { name: "Créer le cours" }))
    expect(within(dialog).getByText("Donnez un titre au cours.")).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()

    await userEvent.type(within(dialog).getByLabelText(/^Titre/), "Météo")
    await userEvent.click(within(dialog).getByRole("button", { name: "Créer le cours" }))

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Cours créé" }))
  })

  it("ouvre la modification sur les valeurs du cours et enregistre la licence choisie", async () => {
    const update = jest.fn(() => ({
      data: { updateCourse: { id: 1, title: "Navigation", category: "Théorie", required_license: "CPL" } },
    }))
    renderComponent([
      listMock(),
      {
        request: {
          query: UPDATE_COURSE,
          variables: {
            id: 1,
            updateCourseInput: {
              title: "Navigation",
              description: "Préparer une navigation.",
              category: "Théorie",
              required_license: "CPL",
            },
          },
        },
        result: update,
      },
      listMock(),
    ])
    await screen.findByRole("table")

    await userEvent.click(screen.getByRole("button", { name: "Modifier le cours Navigation" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText(/^Titre/)).toHaveValue("Navigation")

    await userEvent.click(within(dialog).getByRole("combobox", { name: /Licence requise/ }))
    await userEvent.click(await screen.findByRole("option", { name: "CPL" }))
    await userEvent.click(within(dialog).getByRole("button", { name: "Enregistrer" }))

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
  })

  it("demande confirmation, en nommant le cours, avant de le supprimer", async () => {
    const remove = jest.fn(() => ({ data: { deleteCourse: true } }))
    renderComponent([
      listMock(),
      { request: { query: DELETE_COURSE, variables: { id: 2 } }, result: remove },
      listMock([courses[0]]),
    ])
    await screen.findByRole("table")

    await userEvent.click(screen.getByRole("button", { name: "Supprimer le cours Radio" }))
    expect(remove).not.toHaveBeenCalled()
    expect(screen.getByText(/Le cours « Radio » sera définitivement supprimé/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }))

    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByText("Radio")).not.toBeInTheDocument())
  })

  it("prévient en clair quand l'enregistrement échoue et garde le formulaire ouvert", async () => {
    renderComponent([
      listMock(),
      {
        request: {
          query: CREATE_COURSE,
          variables: { createCourseInput: { title: "Météo", description: "", category: "", required_license: null } },
        },
        error: new Error("duplicate key value violates unique constraint"),
      },
    ])
    await screen.findByRole("table")

    await userEvent.click(screen.getByRole("button", { name: "Créer un cours" }))
    const dialog = await screen.findByRole("dialog")
    await userEvent.type(within(dialog).getByLabelText(/^Titre/), "Météo")
    await userEvent.click(within(dialog).getByRole("button", { name: "Créer le cours" }))

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Cours non créé" })))
    expect(mockToast.mock.calls[0][0].description).not.toMatch(/duplicate/)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })
})
