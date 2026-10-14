import React from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { FileText, Pencil } from "lucide-react"
import { formatDate } from "@/lib/format"
import { getBackendBaseUrl } from "@/lib/runtime-config"
import { licenseStatus } from "./license-status"

export interface License {
  id: string | number
  license_type: string
  status: string
  is_valid: boolean
  license_number: string | null
  certification_authority: string | null
  issue_date: string | number | Date | null
  expiration_date: string | number | Date | null
  documents_url?: string[] | null
}

interface LicenseCardProps {
  license: License
  /** Correct the licence; it then waits for an administrator again. Enables the action. */
  onEdit?: (license: License) => void
}

export function LicenseCard({ license, onEdit }: LicenseCardProps) {
  const { t } = useTranslation("profile")
  const status = licenseStatus(license)
  const pending = (license.status ?? "").toLowerCase() === "pending"
  const documents = license.documents_url ?? []

  const facts = [
    { label: t("licenses.facts.number"), value: license.license_number || "—" },
    { label: t("licenses.facts.authority"), value: license.certification_authority || "—" },
    { label: t("licenses.facts.issuedOn"), value: formatDate(license.issue_date) },
    { label: t("licenses.facts.expiresOn"), value: formatDate(license.expiration_date) },
  ]

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">{license.license_type}</CardTitle>
          <Badge variant={status.variant} className="shrink-0">
            {status.label}
          </Badge>
        </div>
        {pending && <p className="text-sm text-muted-foreground">{t("licenses.pendingHint")}</p>}
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{fact.label}</dt>
              <dd className="break-words font-medium tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
        {documents.length > 0 && (
          <ul className="space-y-1 text-sm">
            {documents.map((url, index) => (
              <li key={url}>
                <a
                  href={url.startsWith("http") ? url : `${getBackendBaseUrl()}${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {t("licenses.document", { number: index + 1 })}
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {onEdit && (
        <CardFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(license)}
            aria-label={t("licenses.editLabel", { type: license.license_type })}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            {t("common:actions.edit")}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
