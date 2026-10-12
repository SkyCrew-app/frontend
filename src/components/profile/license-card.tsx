import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/format"
import { licenseStatus } from "./license-status"

export interface License {
  id: string
  license_type: string
  status: string
  is_valid: boolean
  license_number: string
  certification_authority: string
  issue_date: string | number | Date
  expiration_date: string | number | Date
}

interface LicenseCardProps {
  license: License
}

export function LicenseCard({ license }: LicenseCardProps) {
  const status = licenseStatus(license)

  const facts = [
    { label: "Numéro", value: license.license_number || "—" },
    { label: "Autorité", value: license.certification_authority || "—" },
    { label: "Délivrée le", value: formatDate(license.issue_date) },
    { label: "Expire le", value: formatDate(license.expiration_date) },
  ]

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">{license.license_type}</CardTitle>
          <Badge variant={status.variant} className="shrink-0">
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{fact.label}</dt>
              <dd className="break-words font-medium tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
