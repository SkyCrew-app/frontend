import i18n from "@/lib/i18n"
import type { Flight, FlightPerson } from "@/interfaces/flight"

type BadgeVariant = "info" | "success" | "neutral"

const VARIANTS: Record<string, BadgeVariant> = {
  PILOT_IN_COMMAND: "neutral",
  DUAL: "info",
  INSTRUCTOR: "success",
}

const nameOf = (person: FlightPerson | null | undefined) =>
  [person?.first_name, person?.last_name].filter(Boolean).join(" ")

// The part the owner of the logbook took in a flight, the same wording wherever it is shown:
// pilot in command, dual instruction (with which instructor) or instructor (of which student).
export function logbookRole(
  flight: Pick<Flight, "logbook_role" | "instructor" | "user">,
): { label: string; variant: BadgeVariant; withWhom: string } | null {
  const role = flight.logbook_role
  if (!role || !VARIANTS[role]) return null
  const other = role === "INSTRUCTOR" ? nameOf(flight.user) : role === "DUAL" ? nameOf(flight.instructor) : ""
  return {
    label: i18n.t(`flights:logbook.role.${role}`),
    variant: VARIANTS[role],
    withWhom: other
      ? i18n.t(role === "INSTRUCTOR" ? "flights:logbook.role.student" : "flights:logbook.role.instructor", {
          name: other,
        })
      : "",
  }
}
