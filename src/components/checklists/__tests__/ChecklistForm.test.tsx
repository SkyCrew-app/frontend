import { act, fireEvent, render, screen } from "@testing-library/react"
import { ChecklistForm } from "../ChecklistForm"
import { ChecklistSubmissionStatus } from "@/interfaces/checklist"

const item = {
  id: 1,
  title: "Carburant",
  description: "",
  category: "EXTERIOR",
  order_index: 0,
  required: true,
} as any

const submission = {
  id: 9,
  status: ChecklistSubmissionStatus.IN_PROGRESS,
  responses: [{ itemId: 1, checked: true }],
} as any

describe("ChecklistForm", () => {
  it("saves the last answers before completing the checklist", async () => {
    const calls: string[] = []
    let saved: () => void = () => {}
    const onUpdate = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          calls.push("save")
          saved = resolve
        }),
    )
    const onComplete = jest.fn(() => {
      calls.push("complete")
    })

    render(<ChecklistForm submission={submission} items={[item]} onUpdate={onUpdate} onComplete={onComplete} />)

    fireEvent.click(screen.getByRole("button", { name: /terminer la checklist/i }))

    expect(onUpdate).toHaveBeenCalledWith([{ itemId: 1, checked: true, note: undefined }])
    expect(onComplete).not.toHaveBeenCalled()

    await act(async () => {
      saved()
    })

    expect(calls).toEqual(["save", "complete"])
  })
})
