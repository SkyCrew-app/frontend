"use client"

import { useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { PILOT_LICENSES, type SettingsFormValues } from "@/lib/settings"
import { SettingsSection } from "../settings-field"

export function MembersTab() {
  const { t } = useTranslation("administration")
  // The membership and guest fees and the club rules are not shown: nothing in the
  // application uses them yet (the API keeps their values).
  const { watch, setValue } = useFormContext<SettingsFormValues>()
  const pilotLicenses = watch("pilotLicenses") ?? []

  const toggleLicense = (license: string, checked: boolean) => {
    const updated = checked ? [...pilotLicenses, license] : pilotLicenses.filter((item) => item !== license)
    setValue("pilotLicenses", updated, { shouldDirty: true })
  }

  return (
    <div className="space-y-6">
      <SettingsSection title={t("settings.members.licences.title")} description={t("settings.members.licences.description")}>
        <fieldset>
          <legend className="sr-only">{t("settings.members.licences.title")}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PILOT_LICENSES.map((license) => (
              <div key={license} className="flex min-h-9 items-center gap-2">
                <Checkbox
                  id={`license-${license}`}
                  checked={pilotLicenses.includes(license)}
                  onCheckedChange={(checked) => toggleLicense(license, checked === true)}
                />
                <Label htmlFor={`license-${license}`} className="font-normal">
                  {license}
                </Label>
              </div>
            ))}
          </div>
        </fieldset>
      </SettingsSection>
    </div>
  )
}
