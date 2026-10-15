import React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import { MockedProvider } from "@apollo/client/testing"
import AppSidebar from "../Sidebar"
import { GET_ME, GET_USER_PROFILE } from "@/graphql/user"
import { GET_PLAN } from "@/graphql/plan"

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))
jest.mock("@/components/hooks/useLogout", () => ({ useLogout: () => jest.fn() }))
jest.mock("@/components/hooks/use-toast", () => ({ toast: jest.fn(), useToast: () => ({ toast: jest.fn() }) }))

const planMock = (plan: "CLUB" | "ECOLE") => ({
  request: { query: GET_PLAN },
  result: {
    data: {
      plan: {
        plan,
        features: plan === "ECOLE" ? ["INSTRUCTION"] : [],
        maxAircraft: null,
        aircraftInService: 2,
        maxMembers: null,
        activeMembers: 12,
      },
    },
  },
})

const renderSidebar = (role: string, plan?: "CLUB" | "ECOLE") =>
  render(
    <MockedProvider
      addTypename={false}
      mocks={[
        ...(plan ? [planMock(plan)] : []),
        { request: { query: GET_ME }, result: { data: { me: { id: 3, email: "membre@exemple.fr" } } } },
        {
          request: { query: GET_USER_PROFILE, variables: { email: "membre@exemple.fr" } },
          result: {
            data: {
              userByEmail: {
                id: 3,
                first_name: "Camille",
                last_name: "Martin",
                profile_picture: null,
                user_account_balance: 0,
                preferred_aerodrome: null,
                total_flight_hours: 0,
                role: { id: 1, role_name: role },
                dashboard_widgets: null,
              },
            },
          },
        },
      ]}
    >
      <AppSidebar isMobileOpen={false} onCloseMobileMenu={jest.fn()} />
    </MockedProvider>,
  )

// The profile decides what the menu shows: wait for it.
const sidebarOf = async () => {
  const sidebar = screen.getByRole("navigation", { name: "Navigation principale" })
  await within(sidebar).findByText("Camille Martin")
  return within(sidebar)
}

const administrationLink = (sidebar: ReturnType<typeof within>) => sidebar.queryByRole("link", { name: "Administration" })

describe("Sidebar: the administration section per role", () => {
  it("leads an administrator to the administration home", async () => {
    renderSidebar("Administrateur")
    const sidebar = await sidebarOf()

    expect(administrationLink(sidebar)).toHaveAttribute("href", "/administration")
  })

  it.each([
    // The first page of the section the role may open, as the route guard decides.
    ["Technicien", "/administration/incidents"],
    ["Instructeur", "/administration/checklists"],
  ])("leads a %s to the administration pages of that role only", async (role, firstPage) => {
    renderSidebar(role)
    const sidebar = await sidebarOf()

    expect(administrationLink(sidebar)).toHaveAttribute("href", firstPage)
  })

  it("has no administration section for a pilot", async () => {
    renderSidebar("Pilote")
    const sidebar = await sidebarOf()

    expect(sidebar.getByRole("link", { name: "Carnet de vol" })).toBeInTheDocument()
    expect(administrationLink(sidebar)).not.toBeInTheDocument()
  })
})

describe("Sidebar: the plan of the club", () => {
  it("leaves instruction out of the menu in the Club plan", async () => {
    renderSidebar("Administrateur", "CLUB")
    const sidebar = await sidebarOf()

    await waitFor(() => expect(sidebar.queryByRole("link", { name: "Instruction" })).not.toBeInTheDocument())
    expect(sidebar.queryByRole("link", { name: "E-learning" })).not.toBeInTheDocument()
    expect(sidebar.getByRole("link", { name: "Carnet de vol" })).toBeInTheDocument()
  })

  it("shows instruction in the Club + École plan", async () => {
    renderSidebar("Pilote", "ECOLE")
    const sidebar = await sidebarOf()

    expect(await sidebar.findByRole("link", { name: "Instruction" })).toHaveAttribute("href", "/instruction")
  })
})
