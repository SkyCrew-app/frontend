import React from "react"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { AddLicenseForm } from "../add-license-form"
import { CreateUserForm } from "../create-user-form"
import { EditUserForm } from "../edit-user-form"
import { UsersTable } from "../users-table"
import type { User } from "@/interfaces/user"

// Radix Select needs layout APIs jsdom does not have: a native select, labelled through the trigger id, keeps the same contract.
jest.mock("@/components/ui/select", () => {
  type SelectProps = {
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    children: React.ReactNode
  }
  type ItemProps = { value: string; children: React.ReactNode }
  const SelectTrigger: React.FC<{ id?: string; children?: React.ReactNode }> = () => null
  const Select = ({ value, defaultValue, onValueChange, children }: SelectProps) => {
    const trigger = React.Children.toArray(children).find(
      (child): child is React.ReactElement<{ id?: string }> => React.isValidElement(child) && child.type === SelectTrigger,
    )
    const controlled = value !== undefined ? { value } : { defaultValue: defaultValue ?? "" }
    return (
      <select id={trigger?.props.id} {...controlled} onChange={(e) => onValueChange?.(e.target.value)}>
        <option value="" />
        {children}
      </select>
    )
  }
  const SelectItem = ({ value, children }: ItemProps) => <option value={value}>{children}</option>
  const Passthrough = ({ children }: { children: React.ReactNode }) => <>{children}</>
  return { Select, SelectItem, SelectContent: Passthrough, SelectTrigger, SelectValue: () => null }
})

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

    fireEvent.change(screen.getByLabelText(/^Prénom/), { target: { value: "Camille-Anne" } })
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    expect(onSubmit).toHaveBeenCalledWith({
      first_name: "Camille-Anne",
      last_name: "Martin",
      email: "camille@exemple.fr",
      date_of_birth: "1990-05-12",
      phone_number: "0612345678",
    })
  })

  const renderEdit = (onSubmit = jest.fn()) => {
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
    return onSubmit
  }

  it("accepts an international phone number and saves it without separators", () => {
    const onSubmit = renderEdit()

    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "+44 20 7946-0958" } })
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ phone_number: "+442079460958" }))
  })

  it("refuses a phone number that is not one, under the field", () => {
    const onSubmit = renderEdit()

    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "12 34" } })
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    expect(screen.getByText("Ce numéro de téléphone n'est pas valide.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("lets a member have no phone number", () => {
    const onSubmit = renderEdit()

    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ phone_number: "" }))
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

  it("asks for the names instead of saving a member without one", async () => {
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

    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: "  " } })
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    expect(await screen.findByText("Indiquez le nom.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("reports the chosen role to the page", () => {
    const onRoleChange = jest.fn()
    render(
      <EditUserForm
        isOpen
        onOpenChange={jest.fn()}
        user={user}
        roles={[
          { id: 2, role_name: "Pilote" },
          { id: 3, role_name: "Instructeur" },
        ]}
        selectedRole="2"
        onRoleChange={onRoleChange}
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByLabelText("Rôle")).toHaveValue("2")
    fireEvent.change(screen.getByLabelText("Rôle"), { target: { value: "3" } })
    expect(onRoleChange).toHaveBeenCalledWith("3")
  })
})

describe("CreateUserForm", () => {
  it("opens the panel from its button", () => {
    const onOpenChange = jest.fn()
    render(<CreateUserForm isOpen={false} onOpenChange={onOpenChange} onSubmit={jest.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: "Ajouter un membre" }))
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it("keeps the button but says why it does nothing once every member place of the plan is used", () => {
    const onOpenChange = jest.fn()
    render(<CreateUserForm isOpen={false} onOpenChange={onOpenChange} membersLimitReached={25} onSubmit={jest.fn()} />)

    const button = screen.getByRole("button", { name: "Ajouter un membre" })
    expect(button).toHaveAttribute("aria-disabled", "true")
    expect(button).toHaveAccessibleDescription(
      "Votre formule permet 25 membres actifs : désactivez-en un ou contactez votre fournisseur pour changer de formule",
    )
    fireEvent.click(button)
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("shows what is missing under the fields instead of submitting", async () => {
    const onSubmit = jest.fn()
    render(<CreateUserForm isOpen onOpenChange={jest.fn()} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole("button", { name: "Ajouter le membre" }))

    expect(await screen.findByText("Indiquez le prénom.")).toBeInTheDocument()
    expect(screen.getByText("Indiquez le nom.")).toBeInTheDocument()
    expect(screen.getByText("Indiquez l'adresse e-mail.")).toBeInTheDocument()
    expect(screen.getByText("Indiquez la date de naissance.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("submits the trimmed values", async () => {
    const onSubmit = jest.fn()
    render(<CreateUserForm isOpen onOpenChange={jest.fn()} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/^Prénom/), { target: { value: " Camille " } })
    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: "Martin" } })
    fireEvent.change(screen.getByLabelText(/^Adresse e-mail/), { target: { value: "camille@exemple.fr " } })
    fireEvent.change(screen.getByLabelText(/^Date de naissance/), { target: { value: "1990-05-12" } })
    fireEvent.click(screen.getByRole("button", { name: "Ajouter le membre" }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        first_name: "Camille",
        last_name: "Martin",
        email: "camille@exemple.fr",
        date_of_birth: "1990-05-12",
      }),
    )
  })

  it("proposes the pilot role by default and sends the role chosen", async () => {
    const onSubmit = jest.fn()
    const roles = [
      { id: 1, role_name: "Administrateur" },
      { id: 2, role_name: "Pilote" },
      { id: 3, role_name: "Instructeur" },
    ]
    render(<CreateUserForm isOpen onOpenChange={jest.fn()} roles={roles as never} onSubmit={onSubmit} />)

    // Nobody becomes an administrator without the administrator choosing it.
    expect(screen.getByLabelText("Rôle")).toHaveValue("2")

    fireEvent.change(screen.getByLabelText(/^Prénom/), { target: { value: "Camille" } })
    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: "Martin" } })
    fireEvent.change(screen.getByLabelText(/^Adresse e-mail/), { target: { value: "camille@exemple.fr" } })
    fireEvent.change(screen.getByLabelText(/^Date de naissance/), { target: { value: "1990-05-12" } })
    fireEvent.change(screen.getByLabelText("Rôle"), { target: { value: "3" } })
    fireEvent.click(screen.getByRole("button", { name: "Ajouter le membre" }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ roleId: 3 })))
  })
})

describe("AddLicenseForm", () => {
  it("shows what is missing under the fields of each step instead of submitting", async () => {
    const onSubmit = jest.fn()
    const { unmount } = render(
      <AddLicenseForm isOpen onOpenChange={jest.fn()} users={[user]} loading={false} onSubmit={onSubmit} />,
    )

    // First step: the licence itself.
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Suivant" }))

    expect(await screen.findByText("Choisissez le membre concerné.")).toBeInTheDocument()
    expect(screen.getByText("Choisissez le type de licence.")).toBeInTheDocument()
    expect(screen.getByText("Indiquez le numéro de la licence.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ajouter la licence" })).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    unmount()

    // Second step, reached once the first one is complete.
    render(
      <AddLicenseForm isOpen onOpenChange={jest.fn()} users={[user]} loading={false} defaultUserId="7" onSubmit={onSubmit} />,
    )
    const panel = within(screen.getByRole("dialog"))
    fireEvent.change(panel.getByLabelText(/^Type de licence/), { target: { value: "PPL" } })
    fireEvent.change(panel.getByLabelText(/^Numéro de licence/), { target: { value: "FRA.FCL.PA00123456" } })
    fireEvent.click(panel.getByRole("button", { name: "Suivant" }))
    fireEvent.click(await panel.findByRole("button", { name: "Ajouter la licence" }))

    expect(await screen.findByText("Indiquez la date de délivrance.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
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
