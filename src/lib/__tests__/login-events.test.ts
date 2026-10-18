import {
  LOGIN_DEVICE_TYPES,
  LOGIN_METHODS,
  LOGIN_OUTCOMES,
  LOGIN_PERIODS,
  loginAccountLabel,
  loginDeviceLabel,
  loginMethodLabel,
  loginOutcomeBadge,
  loginOutcomeLabel,
  periodStart,
} from "../login-events"
import fs from "node:fs"
import path from "node:path"
import frAdministration from "@/locales/fr/administration.json"
import enAdministration from "@/locales/en/administration.json"

const schema = fs.readFileSync(path.join(__dirname, "..", "..", "graphql", "schema.graphql"), "utf8")

const enumValues = (name: string) => {
  const match = new RegExp(`enum ${name} \\{([^}]*)\\}`).exec(schema)
  return (match?.[1] ?? "").split(/\s+/).filter(Boolean).sort()
}

describe("sign-in log wording", () => {
  it("knows every outcome, device and method of the API", () => {
    expect([...LOGIN_OUTCOMES].sort()).toEqual(enumValues("LoginOutcome"))
    expect([...LOGIN_DEVICE_TYPES].sort()).toEqual(enumValues("LoginDeviceType"))
    expect([...LOGIN_METHODS].sort()).toEqual(enumValues("LoginMethod"))
  })

  it("names each of them in French and in English", () => {
    for (const locale of [frAdministration, enAdministration]) {
      const log = locale.loginLog as unknown as Record<string, Record<string, string>>
      for (const outcome of LOGIN_OUTCOMES) expect([outcome, typeof log.outcomes[outcome]]).toEqual([outcome, "string"])
      for (const device of LOGIN_DEVICE_TYPES) expect([device, typeof log.devices[device]]).toEqual([device, "string"])
      for (const method of LOGIN_METHODS) expect([method, typeof log.methods[method]]).toEqual([method, "string"])
      for (const period of LOGIN_PERIODS)
        expect([period, typeof (log.filters.periods as unknown as Record<string, string>)[period]]).toEqual([
          period,
          "string",
        ])
    }
  })

  it("names an outcome, and keeps the code of one it does not know", () => {
    expect(loginOutcomeLabel("WRONG_PASSWORD")).toBe("Mot de passe erroné")
    expect(loginOutcomeLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW")
    expect(loginMethodLabel("TWO_FACTOR_CODE")).toBe("par code de double authentification")
    expect(loginMethodLabel(null)).toBeNull()
  })

  it("colours a success, a warning and a refusal apart", () => {
    expect(loginOutcomeBadge("SUCCESS")).toBe("success")
    expect(loginOutcomeBadge("WRONG_PASSWORD")).toBe("warning")
    expect(loginOutcomeBadge("LOCKED_OR_THROTTLED")).toBe("danger")
    expect(loginOutcomeBadge("LOGOUT")).toBe("neutral")
    expect(loginOutcomeBadge("SOMETHING_NEW")).toBe("neutral")
  })

  it("describes the device in a few words", () => {
    expect(loginDeviceLabel({ browser: "Edge 130", os: "Windows", device_type: "DESKTOP" })).toBe(
      "Edge 130 · Windows · Ordinateur",
    )
    expect(loginDeviceLabel({ browser: null, os: "Android", device_type: "TABLET" })).toBe("Android · Tablette")
    expect(loginDeviceLabel({ browser: null, os: null, device_type: "UNKNOWN" })).toBe("Appareil inconnu")
  })

  it("names the account tried, or the address typed when it matches nobody", () => {
    expect(loginAccountLabel({ user_id: 7, member_name: "Jean Dupont", attempted_email: null })).toBe("Jean Dupont")
    expect(loginAccountLabel({ user_id: 7, member_name: null, attempted_email: null })).toBe("Ancien membre")
    expect(loginAccountLabel({ user_id: null, member_name: null, attempted_email: "x@y.fr" })).toBe(
      "Adresse inconnue : x@y.fr",
    )
    expect(loginAccountLabel({ user_id: null, member_name: null, attempted_email: null })).toBe("Adresse inconnue")
  })

  it("starts each period at the right moment", () => {
    const now = Date.parse("2026-10-18T12:00:00.000Z")
    expect(periodStart("all", now)).toBeNull()
    expect(periodStart("day", now)).toBe("2026-10-17T12:00:00.000Z")
    expect(periodStart("week", now)).toBe("2026-10-11T12:00:00.000Z")
    expect(periodStart("month", now)).toBe("2026-09-18T12:00:00.000Z")
  })
})
