import React from "react"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import { StatsCards } from "../stats-cards"
import type { Reservation } from "@/interfaces/reservation"

const HOUR = 60 * 60 * 1000
const booking = (startsInHours: number, hours: number, charged: number | null, status = "CONFIRMED") =>
  ({
    id: startsInHours,
    status,
    start_time: new Date(Date.now() + startsInHours * HOUR).toISOString(),
    end_time: new Date(Date.now() + (startsInHours + hours) * HOUR).toISOString(),
    charged_amount: charged,
    aircraft: { id: 1, registration_number: "F-ABCD" },
  }) as unknown as Reservation

const valueOf = (label: string) => screen.getByText(label).parentElement?.textContent

describe("StatsCards", () => {
  it("montre ce qui arrive, les heures réservées et ce qu'elles ont coûté, sans statut « en attente »", () => {
    render(
      <StatsCards
        reservations={[booking(24, 2, 330), booking(-48, 1.5, 247.5), booking(48, 1, 165, "CANCELLED")]}
      />,
    )

    expect(valueOf("Total")).toContain("2")
    expect(valueOf("À venir")).toContain("1")
    expect(valueOf("Heures réservées")).toContain("3 h 30")
    expect(valueOf("Montant payé")).toMatch(/577,50\s€/)
    expect(screen.queryByText("En attente")).not.toBeInTheDocument()
  })
})
