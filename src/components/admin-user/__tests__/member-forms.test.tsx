import { fireEvent, render, screen } from "@testing-library/react"
import { AddLicenseForm } from "../add-license-form"
import { EditUserForm } from "../edit-user-form"
import { UsersTable } from "../users-table"
import type { User } from "@/interfaces/user"

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

const user: User = {
  id: "7",
  first_name: "Camille",
  last_name: "Martin",
  email: "camille@exemple.fr",
  date_of_birth: "1990-05-12T00:00:00.000Z",
  is2FAEnabled: false,
  isEmailConfirmed: false,
  phone_number: "0612345678",
  role: { id: 2, role_name: "Pilote" },
}

describe("EditUserForm", () => {
  it("keeps the e-mail read-only, since the API finds the member by it", () => {
    const onSubmit = jest.fn()
    render(
      <EditUserForm
        isOpen
        onOpenChange={jest.fn()}
        user={user}
        roles={[{ id: 2, role_name: "Pilote" }]}
        selectedRole="2"
        onRoleChange={jest.fn()}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByLabelText("Adresse e-mail")).toHaveAttribute("readonly")

    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Camille-Anne" } })
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    expect(onSubmit).toHaveBeenCalledWith({
      first_name: "Camille-Anne",
      last_name: "Martin",
      email: "camille@exemple.fr",
      date_of_birth: "1990-05-12",
      phone_number: "0612345678",
    })
  })

  it("does not crash on a member without a birth date", () => {
    render(
      <EditUserForm
        isOpen
        onOpenChange={jest.fn()}
        user={{ ...user, date_of_birth: null as unknown as string }}
        roles={[]}
        selectedRole={null}
        onRoleChange={jest.fn()}
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByLabelText("Date de naissance")).toHaveValue("")
  })
})

describe("AddLicenseForm", () => {
  it("shows what is missing under the fields instead of submitting", () => {
    const onSubmit = jest.fn()
    render(<AddLicenseForm isOpen onOpenChange={jest.fn()} users={[user]} loading={false} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole("button", { name: "Ajouter la licence" }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText("Choisissez le membre concerné.")).toBeInTheDocument()
    expect(screen.getByText("Choisissez le type de licence.")).toBeInTheDocument()
    expect(screen.getByText("Indiquez le numéro de la licence.")).toBeInTheDocument()
    expect(screen.getByText("Indiquez la date de délivrance.")).toBeInTheDocument()
  })

  it("preselects the member the dialog was opened for", () => {
    render(
      <AddLicenseForm isOpen onOpenChange={jest.fn()} users={[user]} loading={false} defaultUserId="7" onSubmit={jest.fn()} />,
    )

    expect(screen.getByRole("combobox", { name: /Membre/ })).toHaveTextContent("Camille Martin")
  })
})

describe("UsersTable", () => {
  it("opens the member sheet from the row and shows statuses in French", () => {
    const onViewDetails = jest.fn()
    render(<UsersTable users={[user]} loading={false} onEdit={jest.fn()} onViewDetails={onViewDetails} />)

    expect(screen.getAllByText("Invitation en attente").length).toBeGreaterThan(0)
    fireEvent.click(screen.getByText("Camille Martin"))
    expect(onViewDetails).toHaveBeenCalledWith("7")
  })

  it("offers to reset the filters when nothing matches", () => {
    const onResetFilters = jest.fn()
    render(
      <UsersTable
        users={[]}
        loading={false}
        filtered
        onEdit={jest.fn()}
        onViewDetails={jest.fn()}
        onResetFilters={onResetFilters}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser les filtres" }))
    expect(onResetFilters).toHaveBeenCalled()
  })
})
