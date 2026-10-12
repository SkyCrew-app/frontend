"use client"

import { useFormContext } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { PILOT_LICENSES, type SettingsFormValues } from "@/lib/settings"
import { SettingsField, SettingsSection, UnitInput, errorMessage } from "../settings-field"

export function MembersTab() {
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
      <SettingsSection title="Cotisation et pilotes invités" description="Les montants demandés aux membres et aux invités.">
        <div className="grid gap-4 md:grid-cols-2">
          <SettingsField
            id="membership-fee"
            label="Cotisation annuelle"
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
                <Label htmlFor="allow-guest-pilots">Autoriser les pilotes invités</Label>
                <p id="allow-guest-pilots-hint" className="text-xs text-muted-foreground">
                  Des pilotes extérieurs au club peuvent voler sur ses avions.
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
                label="Frais pour un pilote invité"
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

      <SettingsSection title="Licences de pilote acceptées" description="Cochez les licences reconnues par le club.">
        <fieldset>
          <legend className="sr-only">Licences de pilote acceptées</legend>
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

      <SettingsSection title="Règlement intérieur" description="Le texte du règlement intérieur de l'aéroclub.">
        <SettingsField id="club-rules" label="Texte du règlement">
          <Textarea
            id="club-rules"
            placeholder="Ex. Article 1 – Tout pilote doit être à jour de sa cotisation avant de réserver un avion."
            className="min-h-[200px]"
            {...register("clubRules")}
          />
        </SettingsField>
      </SettingsSection>
    </div>
  )
}
