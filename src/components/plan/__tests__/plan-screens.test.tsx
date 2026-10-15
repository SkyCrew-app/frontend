import React from "react"
import { render, screen } from "@testing-library/react"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import { GET_PLAN } from "@/graphql/plan"
import type { ClubPlan } from "@/lib/plan"
import { PlanGate } from "../PlanGate"
import { PlanCard } from "../PlanCard"

let pathname = "/instruction/courses"
jest.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))

const CLUB: ClubPlan = {
  plan: "CLUB",
  features: [],
  maxAircraft: 3,
  aircraftInService: 3,
  maxMembers: null,
  activeMembers: 42,
}
const ECOLE: ClubPlan = { ...CLUB, plan: "ECOLE", features: ["INSTRUCTION"], maxAircraft: null, aircraftInService: 5 }

const planMock = (plan: ClubPlan): MockedResponse => ({ request: { query: GET_PLAN }, result: { data: { plan } } })

const renderWith = (mocks: MockedResponse[], ui: React.ReactElement) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      {ui}
    </MockedProvider>,
  )

describe("PlanGate", () => {
  beforeEach(() => {
    pathname = "/instruction/courses"
  })

  it("replaces an instruction page by a plain explanation in the Club plan", async () => {
    renderWith([planMock(CLUB)], <PlanGate>Mes cours</PlanGate>)

    expect(await screen.findByRole("heading", { name: "Pas inclus dans votre formule" })).toBeInTheDocument()
    expect(screen.getByText("Une fonction de la formule Club + École")).toBeInTheDocument()
    expect(screen.getByText(/demander un changement de formule à son fournisseur SkyCrew/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Retour au tableau de bord" })).toHaveAttribute("href", "/dashboard")
    expect(screen.queryByText("Mes cours")).not.toBeInTheDocument()
  })

  it("shows the instruction page in the Club + École plan", async () => {
    renderWith([planMock(ECOLE)], <PlanGate>Mes cours</PlanGate>)

    expect(await screen.findByText("Mes cours")).toBeInTheDocument()
  })

  it("shows the page when the plan cannot be read: the API still decides", async () => {
    renderWith([{ request: { query: GET_PLAN }, error: new Error("network") }], <PlanGate>Mes cours</PlanGate>)

    expect(await screen.findByText("Mes cours")).toBeInTheDocument()
  })

  it("never holds back a page every plan has", () => {
    pathname = "/reservations"
    renderWith([], <PlanGate>Planning</PlanGate>)

    expect(screen.getByText("Planning")).toBeInTheDocument()
  })
})

describe("PlanCard", () => {
  it("tells the administrator the plan, what is used and whom to contact", async () => {
    renderWith([planMock(CLUB)], <PlanCard />)

    expect(await screen.findByText("Formule")).toBeInTheDocument()
    expect(screen.getByText("Club")).toBeInTheDocument()
    expect(screen.getByText("3 / 3")).toBeInTheDocument()
    expect(screen.getByText("Limite atteinte")).toBeInTheDocument()
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("sans limite")).toBeInTheDocument()
    expect(screen.getByText("Non incluse")).toBeInTheDocument()
    expect(screen.getByText(/contactez votre fournisseur SkyCrew/)).toBeInTheDocument()
  })

  it("says the Club + École plan includes instruction", async () => {
    renderWith([planMock(ECOLE)], <PlanCard />)

    expect(await screen.findByText("Club + École")).toBeInTheDocument()
    expect(screen.getByText("Incluse")).toBeInTheDocument()
    expect(screen.queryByText("Limite atteinte")).not.toBeInTheDocument()
  })
})
