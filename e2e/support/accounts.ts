import path from "node:path"

export type Role = "admin" | "pilot" | "instructor" | "student"

// Seeded by backend/src/db/demo/demo-users.seeder.ts.
export const ACCOUNTS: Record<Role, { email: string; name: string }> = {
  admin: { email: "demo@skycrew.fr", name: "Demo Admin" },
  pilot: { email: "jean.dupont@skycrew.fr", name: "Jean Dupont" },
  instructor: { email: "marie.laurent@skycrew.fr", name: "Marie Laurent" },
  // A member without a valid licence (her PPL is still pending): she only flies with an instructor.
  student: { email: "emma.girard@skycrew.fr", name: "Emma Girard" },
}

// The demo accounts share one password; override it for another data set.
export const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "demo1234"

/** Saved browser session of a role, written once per run by auth.setup.ts. */
export const sessionFile = (role: Role) => path.join(__dirname, "..", ".auth", `${role}.json`)
