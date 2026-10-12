"use client"

import { useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { SettingsFormValues } from "@/lib/settings"
import { SettingsField, SettingsSection, errorMessage } from "../settings-field"

export function GeneralTab() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<SettingsFormValues>()
  const isMaintenanceActive = watch("isMaintenanceActive")

  return (
    <div className="space-y-6">
      <SettingsSection title="Coordonnées du club" description="Le nom et les moyens de contact de l'aéroclub.">
        <div className="grid gap-4 md:grid-cols-2">
          <SettingsField
            id="club-name"
            label="Nom de l'aéroclub"
            required
            error={errorMessage(errors.clubName)}
            className="md:col-span-2"
          >
            <Input
              id="club-name"
              placeholder="Ex. Aéroclub du Val de Loire"
              aria-invalid={errors.clubName ? true : undefined}
              {...register("clubName")}
            />
          </SettingsField>
          <SettingsField id="contact-email" label="E-mail de contact" required error={errorMessage(errors.contactEmail)}>
            <Input
              id="contact-email"
              type="email"
              autoComplete="email"
              placeholder="contact@aeroclub.fr"
              aria-invalid={errors.contactEmail ? true : undefined}
              {...register("contactEmail")}
            />
          </SettingsField>
          <SettingsField
            id="contact-phone"
            label="Téléphone de contact"
            required
            hint="10 à 14 chiffres, sans espaces. L'indicatif international (+33…) est accepté."
            error={errorMessage(errors.contactPhone)}
          >
            <Input
              id="contact-phone"
              type="tel"
              autoComplete="tel"
              placeholder="0478123456"
              aria-invalid={errors.contactPhone ? true : undefined}
              aria-describedby="contact-phone-hint"
              {...register("contactPhone")}
            />
          </SettingsField>
          <SettingsField
            id="address"
            label="Adresse"
            required
            error={errorMessage(errors.address)}
            className="md:col-span-2"
          >
            <Textarea
              id="address"
              rows={3}
              placeholder={"Aérodrome de Tours-Sorigny\n37250 Sorigny"}
              aria-invalid={errors.address ? true : undefined}
              {...register("address")}
            />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Mode maintenance du site"
        description="Tant qu'il est actif, les visiteurs sont redirigés vers une page de maintenance."
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div className="space-y-1">
              <Label htmlFor="is-maintenance-active">Activer le mode maintenance</Label>
              <p id="is-maintenance-active-hint" className="text-xs text-muted-foreground">
                Prend effet à l'enregistrement des paramètres.
              </p>
            </div>
            <Switch
              id="is-maintenance-active"
              aria-describedby="is-maintenance-active-hint"
              checked={!!isMaintenanceActive}
              onCheckedChange={(checked) => setValue("isMaintenanceActive", checked, { shouldDirty: true })}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SettingsField
              id="maintenance-message"
              label="Message affiché"
              hint="Laissez vide pour afficher le message par défaut."
              className="md:col-span-2"
            >
              <Textarea
                id="maintenance-message"
                rows={3}
                placeholder="Ex. Le site est en cours de mise à jour, il sera de nouveau disponible dans la soirée."
                aria-describedby="maintenance-message-hint"
                {...register("maintenanceMessage")}
              />
            </SettingsField>
            <SettingsField
              id="maintenance-time"
              label="Fin prévue de la maintenance"
              hint="Sert au compte à rebours de la page de maintenance."
            >
              <Input
                id="maintenance-time"
                type="datetime-local"
                aria-describedby="maintenance-time-hint"
                {...register("maintenanceTime")}
              />
            </SettingsField>
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}
