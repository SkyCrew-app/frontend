import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CompetenciesCard } from "../CompetenciesCard"

const competencies = [
  { id: 1, name: "Décollage", description: "Tenir l'axe", validated: true },
  { id: 2, name: "Atterrissage", description: "Arrondi", validated: false },
]

describe("CompetenciesCard", () => {
  it("montre à l'élève l'avancement sans lui proposer de valider ni d'ajouter", () => {
    render(<CompetenciesCard competencies={competencies} canManage={false} onAdd={jest.fn()} onValidate={jest.fn()} />)

    expect(screen.getByText("1 sur 2 validée")).toBeInTheDocument()
    expect(screen.getByText("Validée")).toBeInTheDocument()
    expect(screen.getByText("À valider")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Valider" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ajouter" })).not.toBeInTheDocument()
  })

  it("fait confirmer la validation à l'instructeur, et ne la propose pas deux fois", async () => {
    const onValidate = jest.fn().mockResolvedValue(true)
    render(<CompetenciesCard competencies={competencies} canManage onAdd={jest.fn()} onValidate={onValidate} />)

    // Only the competency still to validate has the button.
    const buttons = screen.getAllByRole("button", { name: "Valider" })
    expect(buttons).toHaveLength(1)

    await userEvent.click(buttons[0])
    expect(onValidate).not.toHaveBeenCalled()
    expect(screen.getByText(/« Atterrissage » sera marquée comme acquise/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Valider la compétence" }))
    await waitFor(() => expect(onValidate).toHaveBeenCalledWith(2))
  })

  it("ajoute une compétence depuis le formulaire, la description restant facultative", async () => {
    const onAdd = jest.fn().mockResolvedValue(true)
    render(<CompetenciesCard competencies={[]} canManage onAdd={onAdd} onValidate={jest.fn()} />)

    await userEvent.click(screen.getByRole("button", { name: "Ajouter une compétence" }))
    const submit = screen.getByRole("button", { name: "Ajouter la compétence" })
    expect(submit).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/Nom de la compétence/), "Tour de piste")
    await userEvent.click(submit)

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith({ name: "Tour de piste", description: "" }))
    await waitFor(() => expect(screen.queryByLabelText(/Nom de la compétence/)).not.toBeInTheDocument())
  })
})
