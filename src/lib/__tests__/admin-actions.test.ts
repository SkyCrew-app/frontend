import {
  ADMIN_ACTION_CODES,
  ADMIN_TARGET_TYPES,
  adminActionDetails,
  adminActionLabel,
  adminTargetLabel,
} from "../admin-actions"
import i18n from "@/lib/i18n"
import frAdministration from "@/locales/fr/administration.json"
import enAdministration from "@/locales/en/administration.json"
import { formatDateTime, formatMoney } from "../format"

describe("action log wording", () => {
  it("names an action, and keeps the code of one it does not know", () => {
    expect(adminActionLabel("member.role_changed")).toBe("Rôle d'un membre modifié")
    expect(adminActionLabel("balance.adjusted")).toBe("Écriture manuelle sur un compte")
    expect(adminActionLabel("flight.amended")).toBe("flight.amended")
  })

  it("names what the action was about", () => {
    expect(adminTargetLabel({ target_type: "member", target_id: "7", target_label: "Jean Dupont" })).toBe(
      "Membre : Jean Dupont",
    )
    expect(adminTargetLabel({ target_type: "incident", target_id: "12", target_label: null })).toBe("Incident n° 12")
    expect(adminTargetLabel({ target_type: "settings", target_id: null, target_label: null })).toBe("Paramètres du club")
    expect(adminTargetLabel({ target_type: "settings", target_id: "1", target_label: null })).toBe("Paramètres du club")
  })

  it("writes a change as before → after", () => {
    expect(adminActionDetails({ from: "Pilote", to: "Instructeur" })).toEqual(["Pilote → Instructeur"])
  })

  it("writes the facts of a manual entry in plain words", () => {
    expect(
      adminActionDetails({ paymentId: 44, direction: "debit", amount: 250, method: "cheque", reason: "Erreur" }),
    ).toEqual([
      "Sens : débit",
      `Montant : ${formatMoney(250)}`,
      "Moyen : chèque",
      "Motif : Erreur",
    ])
  })

  it("lists each setting that changed", () => {
    expect(
      adminActionDetails({
        changes: { clubName: { from: "A", to: "B" }, closureDays: { from: ["sunday"], to: [] } },
      }),
    ).toEqual(["Nom de l'aéroclub : A → B", "Jours de fermeture : dimanche → —"])
  })

  it("names every setting of the club and keeps the code of a field it does not know", () => {
    expect(
      adminActionDetails({
        changes: {
          contactPhone: { from: "+33123456789", to: "+33123456787" },
          isMaintenanceActive: { from: false, to: true },
          somethingNew: { from: 1, to: 2 },
        },
      }),
    ).toEqual(["Téléphone de contact : +33123456789 → +33123456787", "Mode maintenance : non → oui", "somethingNew : 1 → 2"])
  })

  it("writes a nested value in words, not as code", () => {
    expect(
      adminActionDetails({
        changes: { taxonomies: { from: { flightTypes: ["VFR"] }, to: { flightTypes: ["VFR", "IFR"], empty: [] } } },
      }),
    ).toEqual(["Listes du club : Types de vol (VFR) → Types de vol (VFR, IFR) ; empty (—)"])
  })

  it("names the actions on bookings, closed flights and aircraft, with their facts", () => {
    expect(adminActionLabel("reservation.cancelled_for_member")).toBe("Réservation d'un membre annulée")
    expect(adminActionLabel("flight.record_amended")).toBe("Vol clôturé corrigé")
    expect(adminActionLabel("aircraft.returned_to_service")).toBe("Avion remis en service")
    expect(adminTargetLabel({ target_type: "aircraft", target_id: "4", target_label: "F-GABC" })).toBe("Avion : F-GABC")
    expect(adminActionDetails({ from: "UNAVAILABLE", to: "AVAILABLE" })).toEqual(["indisponible → disponible"])
    expect(adminActionDetails({ memberId: 3, start: "2031-05-12T08:00:00.000Z", refundedToStudents: 90 })).toEqual([
      `Début : ${formatDateTime("2031-05-12T08:00:00.000Z")}`,
      `Remboursé aux élèves : ${formatMoney(90)}`,
    ])
  })

  it("has nothing to say without a summary", () => {
    expect(adminActionDetails(null)).toEqual([])
    expect(adminActionDetails({ maintenanceActive: true, keptReservationIds: [] })).toEqual([
      "Site en maintenance : oui",
    ])
  })

  it("leaves out what did not happen and record numbers, and counts the bookings kept", () => {
    expect(
      adminActionDetails({
        refundedAmount: 0,
        upcomingCourses: 1,
        keptReservationIds: [12, 13],
        cancelledReservations: 0,
        paymentId: 50,
      }),
    ).toEqual(["Cours planifiés : 1", "Réservations gardées au planning : 2"])
  })
})

// The API records these codes (its own test holds the same lists): none may reach the screen raw.
describe("every code the API records has its wording", () => {
  const at = (tree: unknown, path: string[]) =>
    path.reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], tree)

  it.each([
    ["fr", frAdministration],
    ["en", enAdministration],
  ])("in %s", (_, locale) => {
    const missing = [
      ...ADMIN_ACTION_CODES.filter(
        (code) => typeof at(locale, ["actionLog", "actions", ...code.split(".")]) !== "string",
      ),
      ...ADMIN_TARGET_TYPES.filter((type) => typeof at(locale, ["actionLog", "targets", type]) !== "string").map(
        (type) => `target ${type}`,
      ),
    ]
    expect(missing).toEqual([])
  })

  it("names a licence validation and its licence in French and English", async () => {
    expect(adminActionLabel("licence.validated")).toBe("Licence validée")
    expect(
      adminTargetLabel({ target_type: "licence", target_id: "3", target_label: "PPL 12345" }),
    ).toBe("Licence : PPL 12345")
    expect(adminActionDetails({ memberId: "9", from: "pending", to: "active" })).toEqual(["en attente → active"])
    await i18n.changeLanguage("en")
    try {
      expect(adminActionLabel("licence.validated")).toBe("Licence validated")
      expect(adminTargetLabel({ target_type: "licence", target_id: "3", target_label: null })).toBe("Licence No. 3")
    } finally {
      await i18n.changeLanguage("fr")
    }
  })

  it("writes the status of an incident in the language of the reader", async () => {
    expect(adminActionDetails({ from: "Ouvert", to: "Résolu" })).toEqual(["ouvert → résolu"])
    await i18n.changeLanguage("en")
    try {
      expect(adminActionDetails({ from: "Ouvert", to: "En cours" })).toEqual(["open → in progress"])
    } finally {
      await i18n.changeLanguage("fr")
    }
  })
})
