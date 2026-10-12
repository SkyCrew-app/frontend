import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QuestionStepper } from "../QuestionStepper"

describe("QuestionStepper", () => {
  it("indique pour chaque question si elle a une réponse, et laquelle est affichée", () => {
    render(<QuestionStepper currentQuestion={1} answered={[true, false, true]} onNavigate={jest.fn()} />)

    expect(screen.getByRole("button", { name: "Question 1, répondue" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Question 2, sans réponse" })).toHaveAttribute("aria-current", "step")
    expect(screen.getByRole("button", { name: "Question 3, répondue" })).not.toHaveAttribute("aria-current")
    expect(screen.getByText("Réponses données : 2 sur 3")).toBeInTheDocument()
  })

  it("permet d'aller directement à une question", async () => {
    const onNavigate = jest.fn()
    render(<QuestionStepper currentQuestion={0} answered={[false, false, false]} onNavigate={onNavigate} />)

    await userEvent.click(screen.getByRole("button", { name: "Question 3, sans réponse" }))

    expect(onNavigate).toHaveBeenCalledWith(2)
  })
})
