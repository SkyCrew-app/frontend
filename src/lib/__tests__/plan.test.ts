import {
  assignableRoles,
  featureOfPage,
  isFull,
  planAllowsPage,
  planIncludes,
  reachedLimit,
  usage,
  type ClubPlan,
} from "../plan"

const plan = (overrides: Partial<ClubPlan> = {}): ClubPlan => ({
  plan: "CLUB",
  features: [],
  maxAircraft: 3,
  aircraftInService: 2,
  maxMembers: null,
  activeMembers: 40,
  ...overrides,
})

const ecole = plan({ plan: "ECOLE", features: ["INSTRUCTION"], maxAircraft: null })

describe("the plan of the club", () => {
  it("shows everything while the plan is unknown, as before plans existed", () => {
    expect(planIncludes(null, "INSTRUCTION")).toBe(true)
    expect(planAllowsPage(undefined, "/instruction/courses")).toBe(true)
  })

  it("leaves the instruction pages out of the Club plan only", () => {
    for (const page of ["/instruction", "/instruction/courses/4", "/instruction/e-learning/2/7", "/administration/e-learning"]) {
      expect(featureOfPage(page)).toBe("INSTRUCTION")
      expect(planAllowsPage(plan(), page)).toBe(false)
      expect(planAllowsPage(ecole, page)).toBe(true)
    }
    for (const page of ["/reservations", "/logbook", "/administration/users", "/instructions-pratiques"]) {
      expect(featureOfPage(page)).toBeNull()
      expect(planAllowsPage(plan(), page)).toBe(true)
    }
  })

  it("writes what is used against what is allowed", () => {
    expect(usage(2, 3)).toBe("2 / 3")
    expect(usage(40, null)).toBe("40")
    expect(isFull(3, 3)).toBe(true)
    expect(isFull(4, 3)).toBe(true)
    expect(isFull(2, 3)).toBe(false)
    expect(isFull(500, null)).toBe(false)
  })

  it("does not offer the instructor role without instruction, except to the member who holds it", () => {
    const roles = [{ role_name: "Pilote" }, { role_name: "Instructeur" }, { role_name: "Administrateur" }]

    expect(assignableRoles(plan(), roles).map((role) => role.role_name)).toEqual(["Pilote", "Administrateur"])
    expect(assignableRoles(plan(), roles, "Instructeur")).toEqual(roles)
    expect(assignableRoles(ecole, roles)).toEqual(roles)
    expect(assignableRoles(null, roles)).toEqual(roles)
  })

  it("gives the number of places once a limit is reached, null while there is room", () => {
    expect(reachedLimit(plan(), "aircraft")).toBeNull()
    expect(reachedLimit(plan({ aircraftInService: 3 }), "aircraft")).toBe(3)
    // More than allowed, after a change of plan.
    expect(reachedLimit(plan({ aircraftInService: 5 }), "aircraft")).toBe(3)
    expect(reachedLimit(plan({ activeMembers: 400 }), "members")).toBeNull()
    expect(reachedLimit(plan({ maxMembers: 40 }), "members")).toBe(40)
    // Unknown plan: the API decides.
    expect(reachedLimit(null, "aircraft")).toBeNull()
  })
})
