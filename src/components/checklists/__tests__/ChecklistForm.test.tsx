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

  it("does not complete the checklist when the last answers could not be saved", async () => {
    const onUpdate = jest.fn().mockResolvedValue(false)
    const onComplete = jest.fn()

    render(<ChecklistForm submission={submission} items={[item]} onUpdate={onUpdate} onComplete={onComplete} />)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /terminer la checklist/i }))
    })

    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onComplete).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument()
  })

  it("keeps an answer given while a save is in flight", async () => {
    jest.useFakeTimers()
    try {
      const onUpdate = jest.fn().mockResolvedValue(undefined)
      const { rerender } = render(
        <ChecklistForm
          submission={{ ...submission, responses: [] }}
          items={[item]}
          onUpdate={onUpdate}
          onComplete={jest.fn()}
        />,
      )

      fireEvent.click(screen.getByRole("checkbox"))
      // The server answers an earlier save with the unchecked state.
      rerender(
        <ChecklistForm
          submission={{ ...submission, responses: [{ itemId: 1, checked: false }] }}
          items={[item]}
          onUpdate={onUpdate}
          onComplete={jest.fn()}
        />,
      )
      expect(screen.getByRole("checkbox")).toBeChecked()

      await act(async () => {
        jest.runOnlyPendingTimers()
      })
      expect(onUpdate).toHaveBeenLastCalledWith([{ itemId: 1, checked: true, note: undefined }])
    } finally {
      jest.useRealTimers()
    }
  })

  it("is read-only once the checklist is completed", () => {
    render(
      <ChecklistForm
        submission={{ ...submission, status: ChecklistSubmissionStatus.COMPLETED }}
        items={[item]}
        onUpdate={jest.fn()}
        onComplete={jest.fn()}
      />,
    )

    expect(screen.getByRole("checkbox")).toBeDisabled()
    expect(screen.queryByRole("button", { name: /terminer la checklist/i })).not.toBeInTheDocument()
  })
})
