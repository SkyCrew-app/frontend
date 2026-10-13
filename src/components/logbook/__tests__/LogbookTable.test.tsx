import React from "react"
import { render, screen, within } from "@testing-library/react"
import LogbookTable from "../LogbookTable"
import { logbookRole } from "../logbook-role"
import type { Flight } from "@/interfaces/flight"

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }))

const flight = (id: number, overrides: Partial<Flight>): Flight => ({
  id,
  flight_hours: 1.5,
  flight_type: "VFR",
  origin_icao: "LFPG",
  destination_icao: "LFPO",
  departure_time: `2026-10-0${id}T09:00:00`,
  user: { id: 9, first_name: "Emma", last_name: "Girard" },
  ...overrides,
})

const marie = { id: 3, first_name: "Marie", last_name: "Laurent" }

describe("Carnet de vol — la fonction à bord", () => {
  it("nomme la fonction et la personne avec qui le vol a été fait", () => {
    expect(logbookRole(flight(1, { logbook_role: "PILOT_IN_COMMAND" }))).toMatchObject({
      label: "Commandant de bord",
      withWhom: "",
    })
    expect(logbookRole(flight(2, { logbook_role: "DUAL", instructor: marie }))).toMatchObject({
      label: "Double commande",
      withWhom: "avec Marie Laurent",
    })
    expect(logbookRole(flight(3, { logbook_role: "INSTRUCTOR", instructor: marie }))).toMatchObject({
      label: "Instructeur",
      withWhom: "élève : Emma Girard",
    })
    // An entry without a role (older API) shows nothing rather than a guess.
    expect(logbookRole(flight(4, {}))).toBeNull()
  })

  it("affiche la fonction de chaque vol dans le tableau", () => {
    render(
      <LogbookTable
        loading={false}
        flights={[
          flight(1, { logbook_role: "PILOT_IN_COMMAND" }),
          flight(2, { logbook_role: "DUAL", instructor: marie }),
          flight(3, { logbook_role: "INSTRUCTOR", instructor: marie }),
        ]}
      />,
    )

    expect(screen.getByRole("columnheader", { name: "Fonction" })).toBeInTheDocument()
    const rows = screen.getAllByRole("row").slice(1)
    // Newest first.
    expect(within(rows[0]).getByText("Instructeur")).toBeInTheDocument()
    expect(within(rows[0]).getByText("élève : Emma Girard")).toBeInTheDocument()
    expect(within(rows[1]).getByText("Double commande")).toBeInTheDocument()
    expect(within(rows[1]).getByText("avec Marie Laurent")).toBeInTheDocument()
    expect(within(rows[2]).getByText("Commandant de bord")).toBeInTheDocument()
  })
})
