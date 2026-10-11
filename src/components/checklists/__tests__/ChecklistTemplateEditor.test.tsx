import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChecklistTemplateEditor } from "../ChecklistTemplateEditor"
import type { ChecklistItem, ChecklistTemplate } from "@/interfaces/checklist"

const items: ChecklistItem[] = [
  { id: 1, item_name: "Pneus", description: "Usure", category: "EXTERIOR", is_required: true, sort_order: 0 },
  { id: 2, item_name: "Altimètre", category: "COCKPIT", is_required: false, sort_order: 1 },
]

const template: ChecklistTemplate = {
  id: 7,
  name: "Prévol",
  aircraft_model: "DR400",
  is_active: true,
  items,
}

const setup = (overrides: Partial<React.ComponentProps<typeof ChecklistTemplateEditor>> = {}) => {
  const props = {
    template,
    items,
    onAddItem: jest.fn().mockResolvedValue(true),
    onUpdateItem: jest.fn().mockResolvedValue(true),
    onDeleteItem: jest.fn(),
    onReorder: jest.fn(),
    ...overrides,
  }
  render(<ChecklistTemplateEditor {...props} />)
  return props
}

describe("ChecklistTemplateEditor", () => {
  it("préremplit le formulaire et enregistre la modification d'un item", async () => {
    const user = userEvent.setup()
    const props = setup()

    await user.click(screen.getByRole("button", { name: "Modifier l'item Pneus" }))

    const name = screen.getByLabelText("Nom de l'item")
    expect(name).toHaveValue("Pneus")
    expect(screen.getByLabelText("Description (optionnel)")).toHaveValue("Usure")
    expect(screen.getByLabelText("Obligatoire")).toBeChecked()

    await user.clear(name)
    await user.type(name, "Pneus et freins")
    await user.click(screen.getByLabelText("Obligatoire"))
    await user.click(screen.getByRole("button", { name: "Enregistrer" }))

    expect(props.onUpdateItem).toHaveBeenCalledWith(items[0], {
      item_name: "Pneus et freins",
      description: "Usure",
      category: "EXTERIOR",
      is_required: false,
    })
    expect(props.onAddItem).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByLabelText("Nom de l'item")).not.toBeInTheDocument())
  })

  it("garde le formulaire ouvert quand l'enregistrement échoue", async () => {
    const user = userEvent.setup()
    const props = setup({ onUpdateItem: jest.fn().mockResolvedValue(false) })

    await user.click(screen.getByRole("button", { name: "Modifier l'item Altimètre" }))
    await user.click(screen.getByRole("button", { name: "Enregistrer" }))

    expect(props.onUpdateItem).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText("Nom de l'item")).toHaveValue("Altimètre")
  })

  it("ajoute un item à partir d'un formulaire vide", async () => {
    const user = userEvent.setup()
    const props = setup()

    await user.click(screen.getByRole("button", { name: "Ajouter un item" }))
    expect(screen.getByRole("button", { name: "Ajouter" })).toBeDisabled()

    await user.type(screen.getByLabelText("Nom de l'item"), "Extincteur")
    await user.click(screen.getByRole("button", { name: "Ajouter" }))

    expect(props.onAddItem).toHaveBeenCalledWith({
      item_name: "Extincteur",
      description: "",
      category: "EXTERIOR",
      is_required: true,
    })
  })
})
