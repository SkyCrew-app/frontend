"use client"

import { useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { PILOT_LICENSES, type SettingsFormValues } from "@/lib/settings"
import { SettingsField, SettingsSection, UnitInput, errorMessage } from "../settings-field"

export function MembersTab() {
  const { t } = useTranslation("administration")
  const {
    register,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<SettingsFormValues>()
  const allowGuestPilots = watch("allowGuestPilots")
  const pilotLicenses = watch("pilotLicenses") ?? []

  const toggleLicense = (license: string, checked: boolean) => {
    const updated = checked ? [...pilotLicenses, license] : pilotLicenses.filter((item) => item !== license)
    setValue("pilotLicenses", updated, { shouldDirty: true })
  }

  const toggleGuestPilots = (checked: boolean) => {
    // The fee field disappears with the option: do not leave an invalid amount behind it.
    if (!checked && !(getValues("guestPilotFee") >= 0)) {
      setValue("guestPilotFee", 0, { shouldDirty: true, shouldValidate: true })
    }
    setValue("allowGuestPilots", checked, { shouldDirty: true })
  }

  return (
    <div className="space-y-6">
      <SettingsSection title={t("settings.members.fees.title")} description={t("settings.members.fees.description")}>
        <div className="grid gap-4 md:grid-cols-2">
          <SettingsField
            id="membership-fee"
            label={t("settings.members.fees.membershipFee")}
            required
            error={errorMessage(errors.membershipFee)}
          >
            <UnitInput
              id="membership-fee"
              unit="€"
              min="0"
              step="0.01"
              placeholder="180"
              aria-invalid={errors.membershipFee ? true : undefined}
              {...register("membershipFee", { valueAsNumber: true })}
            />
          </SettingsField>
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div className="space-y-1">
                <Label htmlFor="allow-guest-pilots">{t("settings.members.fees.allowGuests")}</Label>
                <p id="allow-guest-pilots-hint" className="text-xs text-muted-foreground">
                  {t("settings.members.fees.allowGuestsHint")}
                </p>
              </div>
              <Switch
                id="allow-guest-pilots"
                aria-describedby="allow-guest-pilots-hint"
                checked={!!allowGuestPilots}
                onCheckedChange={toggleGuestPilots}
              />
            </div>
            {allowGuestPilots && (
              <SettingsField
                id="guest-pilot-fee"
                label={t("settings.members.fees.guestFee")}
                required
                error={errorMessage(errors.guestPilotFee)}
                className="md:max-w-sm"
              >
                <UnitInput
                  id="guest-pilot-fee"
                  unit="€"
                  min="0"
                  step="0.01"
                  placeholder="50"
                  aria-invalid={errors.guestPilotFee ? true : undefined}
                  {...register("guestPilotFee", { valueAsNumber: true })}
                />
              </SettingsField>
            )}
          </div>
        </div>
      </SettingsSection>

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

      <SettingsSection title={t("settings.members.rules.title")} description={t("settings.members.rules.description")}>
        <SettingsField id="club-rules" label={t("settings.members.rules.label")}>
          <Textarea
            id="club-rules"
            placeholder={t("settings.members.rules.placeholder")}
            className="min-h-[200px]"
            {...register("clubRules")}
          />
        </SettingsField>
      </SettingsSection>
    </div>
  )
}
