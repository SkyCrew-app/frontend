"use client"

import { useTranslation } from "react-i18next"
import { BadgeCheck } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export interface PendingLicence {
  id: number | string
  license_type: string
  status: string
  user?: { id: number | string; first_name?: string | null; last_name?: string | null } | null
}

interface PendingLicencesNoticeProps {
  licences: PendingLicence[]
  /** Opens the member's sheet on their licences. */
  onOpenMember: (userId: string) => void
}

const nameOf = (user: PendingLicence["user"]) => `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "—"

/** Licences members entered themselves, waiting for an administrator: one line per member. */
export function PendingLicencesNotice({ licences, onOpenMember }: PendingLicencesNoticeProps) {
  const { t } = useTranslation("administration")
  if (licences.length === 0) return null

  const members = new Map<string, { name: string; types: string[] }>()
  for (const licence of licences) {
    if (!licence.user) continue
    const id = String(licence.user.id)
    const entry = members.get(id) ?? { name: nameOf(licence.user), types: [] }
    entry.types.push(licence.license_type)
    members.set(id, entry)
  }

  return (
    <Alert className="border-warning/40 bg-warning/10">
      <BadgeCheck className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{t("users.pendingLicences.title", { count: licences.length })}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{t("users.pendingLicences.description")}</p>
        <ul className="flex flex-wrap gap-2">
          {[...members.entries()].map(([id, member]) => (
            <li key={id}>
              <Button
                variant="outline"
                size="sm"
                className="bg-background"
                onClick={() => onOpenMember(id)}
              >
                {/* The visible name stays part of what is announced. */}
                <span className="sr-only">{t("users.pendingLicences.open")} </span>
                {member.name}
                <span className="text-muted-foreground">{member.types.join(", ")}</span>
              </Button>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
