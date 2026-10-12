import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import CourseFormDialog from "../CourseFormDialog"
import { CREATE_COURSE, GET_MEMBERS_DIRECTORY, UPDATE_COURSE } from "@/graphql/course"

const mockToast = jest.fn()
jest.mock("@/components/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}))

const members = [
  { id: 2, first_name: "Paul", last_name: "Durand", role: { role_name: "Instructeur" } },
  { id: 5, first_name: "Léa", last_name: "Martin", role: { role_name: "Élève" } },
  { id: 9, first_name: "Anne", last_name: "Roy", role: { role_name: "Administrateur" } },
]

const membersMock: MockedResponse = {
  request: { query: GET_MEMBERS_DIRECTORY },
  result: { data: { membersDirectory: members } },
}

const existingCourse = {
  id: 7,
  instructor: members[0],
  student: members[1],
  startTime: "2026-10-12T08:00:00.000Z",
  endTime: null,
  status: "SCHEDULED",
  rating: null,
  competencies: [],
}

const renderDialog = (mocks: MockedResponse[], props: Partial<React.ComponentProps<typeof CourseFormDialog>> = {}) => {
  const onSaved = jest.fn()
  const onClose = jest.fn()
  render(
    <MockedProvider mocks={[membersMock, ...mocks]} addTypename={false}>
      <CourseFormDialog open onClose={onClose} onSaved={onSaved} {...props} />
    </MockedProvider>,
  )
  return { onSaved, onClose }
}

beforeAll(() => {
  // Radix Select relies on APIs jsdom does not have.
  Element.prototype.hasPointerCapture = jest.fn(() => false)
  Element.prototype.setPointerCapture = jest.fn()
  Element.prototype.releasePointerCapture = jest.fn()
  Element.prototype.scrollIntoView = jest.fn()
})

beforeEach(() => mockToast.mockClear())

describe("CourseFormDialog", () => {
  it("ne demande pas l'instructeur à un instructeur qui planifie son propre cours", async () => {
    renderDialog([], { instructorId: 2 })

    expect(await screen.findByRole("heading", { name: "Planifier un cours" })).toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: /Instructeur/ })).not.toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: /Élève/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument()
  })

  it("explique sous chaque champ ce qui manque, sans rien envoyer", async () => {
    renderDialog([], { instructorId: 2 })

    await userEvent.click(await screen.findByRole("button", { name: "Planifier le cours" }))

    expect(screen.getByText("Choisissez l'élève.")).toBeInTheDocument()
    expect(screen.getByText("Indiquez le début du cours.")).toBeInTheDocument()
    expect(mockToast).not.toHaveBeenCalled()
  })

  it("refuse une fin antérieure au début", async () => {
    renderDialog([], { instructorId: 2 })
    await screen.findByRole("heading", { name: "Planifier un cours" })

    fireEvent.change(screen.getByLabelText(/^Début/), { target: { value: "2026-11-20T10:00" } })
    fireEvent.change(screen.getByLabelText(/^Fin/), { target: { value: "2026-11-20T09:00" } })
    await userEvent.click(screen.getByRole("button", { name: "Planifier le cours" }))

    expect(screen.getByText("La fin doit être après le début.")).toBeInTheDocument()
  })

  it("planifie le cours avec l'élève choisi, l'instructeur étant celui qui planifie", async () => {
    const create = jest.fn(() => ({
      data: {
        createCourseInstruction: {
          id: 8,
          instructor: { id: 2 },
          student: { id: 5 },
          startTime: new Date("2026-11-20T10:00").toISOString(),
          endTime: null,
        },
      },
    }))
    const { onSaved, onClose } = renderDialog(
      [
        {
          request: {
            query: CREATE_COURSE,
            variables: {
              input: {
                instructorId: 2,
                studentId: 5,
                startTime: new Date("2026-11-20T10:00").toISOString(),
                endTime: null,
              },
            },
          },
          result: create,
        },
      ],
      { instructorId: 2 },
    )
    await screen.findByRole("heading", { name: "Planifier un cours" })

    await userEvent.click(screen.getByRole("combobox", { name: /Élève/ }))
    // The instructor cannot be their own student.
    expect(screen.queryByRole("option", { name: "Paul Durand" })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole("option", { name: "Léa Martin" }))
    fireEvent.change(screen.getByLabelText(/^Début/), { target: { value: "2026-11-20T10:00" } })
    await userEvent.click(screen.getByRole("button", { name: "Planifier le cours" }))

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(onClose).toHaveBeenCalled()
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Cours planifié" }))
  })

  it("ouvre la modification sur les valeurs du cours et enregistre le nouveau statut", async () => {
    const update = jest.fn(() => ({
      data: {
        updateCourseInstruction: {
          id: 7,
          startTime: existingCourse.startTime,
          endTime: null,
          instructor: { id: 2, first_name: "Paul" },
        },
      },
    }))
    const { onSaved } = renderDialog(
      [
        {
          request: {
            query: UPDATE_COURSE,
            variables: {
              input: {
                id: 7,
                startTime: existingCourse.startTime,
                instructorId: 2,
                studentId: 5,
                status: "COMPLETED",
              },
            },
          },
          result: update,
        },
      ],
      { instructorId: 2, course: existingCourse },
    )

    expect(await screen.findByRole("heading", { name: "Modifier le cours" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("combobox", { name: /Statut/ }))
    await userEvent.click(await screen.findByRole("option", { name: "Terminé" }))
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
  })

  it("prévient en clair quand l'enregistrement échoue et laisse le formulaire ouvert", async () => {
    const { onClose } = renderDialog(
      [
        {
          request: {
            query: UPDATE_COURSE,
            variables: {
              input: { id: 7, startTime: existingCourse.startTime, instructorId: 2, studentId: 5, status: "SCHEDULED" },
            },
          },
          error: new Error("Forbidden resource"),
        },
      ],
      { instructorId: 2, course: existingCourse },
    )

    await userEvent.click(await screen.findByRole("button", { name: "Enregistrer" }))

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Cours non modifié" })),
    )
    expect(mockToast.mock.calls[0][0].description).not.toMatch(/Forbidden/)
    expect(onClose).not.toHaveBeenCalled()
  })
})
