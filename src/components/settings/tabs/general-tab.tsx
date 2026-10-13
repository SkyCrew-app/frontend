"use client"

import { useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { SettingsFormValues } from "@/lib/settings"
import { SettingsField, SettingsSection, errorMessage } from "../settings-field"

export function GeneralTab() {
  const { t } = useTranslation("administration")
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<SettingsFormValues>()
  const isMaintenanceActive = watch("isMaintenanceActive")

  return (
    <div className="space-y-6">
      <SettingsSection title={t("settings.general.contact.title")} description={t("settings.general.contact.description")}>
        <div className="grid gap-4 md:grid-cols-2">
          <SettingsField
            id="club-name"
            label={t("settings.general.contact.clubName")}
            required
            error={errorMessage(errors.clubName)}
            className="md:col-span-2"
          >
            <Input
              id="club-name"
              placeholder={t("settings.general.contact.clubNamePlaceholder")}
              aria-invalid={errors.clubName ? true : undefined}
              {...register("clubName")}
            />
          </SettingsField>
          <SettingsField
            id="contact-email"
            label={t("settings.general.contact.email")}
            required
            error={errorMessage(errors.contactEmail)}
          >
            <Input
              id="contact-email"
              type="email"
              autoComplete="email"
              placeholder={t("settings.general.contact.emailPlaceholder")}
              aria-invalid={errors.contactEmail ? true : undefined}
              {...register("contactEmail")}
            />
          </SettingsField>
          <SettingsField
            id="contact-phone"
            label={t("settings.general.contact.phone")}
            required
            hint={t("settings.general.contact.phoneHint")}
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
            label={t("settings.general.contact.address")}
            required
            error={errorMessage(errors.address)}
            className="md:col-span-2"
          >
            <Textarea
              id="address"
              rows={3}
              placeholder={t("settings.general.contact.addressPlaceholder")}
              aria-invalid={errors.address ? true : undefined}
              {...register("address")}
            />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection
        title={t("settings.general.maintenance.title")}
        description={t("settings.general.maintenance.description")}
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div className="space-y-1">
              <Label htmlFor="is-maintenance-active">{t("settings.general.maintenance.enable")}</Label>
              <p id="is-maintenance-active-hint" className="text-xs text-muted-foreground">
                {t("settings.general.maintenance.enableHint")}
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
              label={t("settings.general.maintenance.message")}
              hint={t("settings.general.maintenance.messageHint")}
              className="md:col-span-2"
            >
              <Textarea
                id="maintenance-message"
                rows={3}
                placeholder={t("settings.general.maintenance.messagePlaceholder")}
                aria-describedby="maintenance-message-hint"
                {...register("maintenanceMessage")}
              />
            </SettingsField>
            <SettingsField
              id="maintenance-time"
              label={t("settings.general.maintenance.end")}
              hint={t("settings.general.maintenance.endHint")}
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
