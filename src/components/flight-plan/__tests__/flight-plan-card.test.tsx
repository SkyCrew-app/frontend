import React from "react"
import { render, screen } from "@testing-library/react"
import { FlightPlanCard } from "../flight-plan-card"
import type { Flight } from "@/interfaces/flight"

const hour = 3_600_000
const flight = (startsIn: number, overrides: Partial<Flight> = {}): Flight => ({
  id: 7,
  flight_hours: 1.5,
  flight_type: "VFR",
  origin_icao: "LFPG",
  destination_icao: "LFOB",
  reservation: {
    id: 3,
    start_time: new Date(Date.now() + startsIn).toISOString(),
    end_time: new Date(Date.now() + startsIn + 2 * hour).toISOString(),
    purpose: "",
    status: "confirmed",
    flight_category: "local",
    aircraft: { id: 1, registration_number: "F-GABC" },
  },
  ...overrides,
})

describe("FlightPlanCard", () => {
  it("offers to close a flight whose booking has started", () => {
    render(<FlightPlanCard flight={flight(-hour)} onEdit={jest.fn()} />)

    expect(screen.getByRole("link", { name: "Clôturer le vol" })).toHaveAttribute("href", "/close_flight/7")
  })

  it("does not offer to close before the booking starts, and says from when", () => {
    render(<FlightPlanCard flight={flight(3 * hour)} onEdit={jest.fn()} />)

    expect(screen.queryByRole("link", { name: "Clôturer le vol" })).not.toBeInTheDocument()
    expect(screen.getByText(/Clôture possible à partir du/)).toBeInTheDocument()
    // The plan can still be opened and edited.
    expect(screen.getByRole("link", { name: "Ouvrir" })).toBeInTheDocument()
  })

  it("does not offer to close a flight without a booking or on a cancelled booking", () => {
    const { unmount } = render(<FlightPlanCard flight={flight(-hour, { reservation: undefined })} onEdit={jest.fn()} />)
    expect(screen.queryByRole("link", { name: "Clôturer le vol" })).not.toBeInTheDocument()
    unmount()

    const cancelled = flight(-hour)
    cancelled.reservation = { ...cancelled.reservation!, status: "cancelled" }
    render(<FlightPlanCard flight={cancelled} onEdit={jest.fn()} />)
    expect(screen.queryByRole("link", { name: "Clôturer le vol" })).not.toBeInTheDocument()
  })
})
