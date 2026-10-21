import { notificationLink } from "../notification-link"

describe("notificationLink", () => {
  it("leads moved addresses to the page that replaced them", () => {
    expect(notificationLink("/maintenance")).toBe("/fleet/maintenance")
    expect(notificationLink("/incidents/")).toBe("/fleet/incidents")
    expect(notificationLink("/invoices?id=3")).toBe("/profile/money_account?id=3")
    expect(notificationLink("/e-learning")).toBe("/instruction/e-learning")
  })

  it("keeps the other addresses as they are", () => {
    expect(notificationLink("/reservations")).toBe("/reservations")
    expect(notificationLink("/fleet/maintenance")).toBe("/fleet/maintenance")
  })

  it("has nothing to open without an address", () => {
    expect(notificationLink(null)).toBeNull()
    expect(notificationLink("  ")).toBeNull()
  })
})
