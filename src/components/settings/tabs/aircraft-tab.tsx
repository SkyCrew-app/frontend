"use client"

import Link from "next/link"
import { useQuery } from "@apollo/client"
import { useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Plane } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import { formatMoney } from "@/lib/format"
import { fuelManagementOptions, type FuelManagement, type SettingsFormValues } from "@/lib/settings"
import { SettingsField, SettingsSection, UnitInput, errorMessage } from "../settings-field"

interface Aircraft {
  id: number | string
  registration_number: string
  model?: string | null
  hourly_cost?: number | null
}

export function AircraftTab() {
  const { t } = useTranslation("administration")
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<SettingsFormValues>()
  const fuelManagement = watch("fuelManagement")
  const { data, loading, error, refetch } = useQuery<{ getAircrafts: Aircraft[] }>(GET_AIRCRAFTS)
  const aircrafts = data?.getAircrafts ?? []

  const manageAircrafts = (
    <Button asChild variant="outline" size="sm">
      <Link href="/administration/planes">{t("settings.aircraft.manage")}</Link>
    </Button>
  )

  return (
    <div className="space-y-6">
      <SettingsSection
        title={t("settings.aircraft.fuel.title")}
        description={t("settings.aircraft.fuel.description")}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium leading-none">{t("settings.aircraft.fuel.management")}</legend>
            <RadioGroup
              value={fuelManagement}
              onValueChange={(value) => setValue("fuelManagement", value as FuelManagement, { shouldDirty: true })}
              className="gap-3"
            >
              {fuelManagementOptions().map((option) => (
                <div key={option.value} className="flex items-start gap-2">
                  <RadioGroupItem value={option.value} id={`fuel-${option.value}`} className="mt-0.5" />
                  <div className="space-y-1">
                    <Label htmlFor={`fuel-${option.value}`}>{option.label}</Label>
                    <p className="text-xs text-muted-foreground">{option.hint}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
          <SettingsField
            id="fuel-price"
            label={t("settings.aircraft.fuel.price")}
            required
            error={errorMessage(errors.fuelPrice)}
          >
            <UnitInput
              id="fuel-price"
              unit="€/L"
              min="0"
              step="0.01"
              placeholder={t("settings.aircraft.fuel.pricePlaceholder")}
              aria-invalid={errors.fuelPrice ? true : undefined}
              {...register("fuelPrice", { valueAsNumber: true })}
            />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection
        title={t("settings.aircraft.rates.title")}
        description={t("settings.aircraft.rates.description")}
        action={aircrafts.length > 0 ? manageAircrafts : undefined}
      >
        {error ? (
          <ErrorState onRetry={() => refetch()} />
        ) : loading ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-10 w-full" />
            ))}
          </div>
        ) : aircrafts.length === 0 ? (
          <EmptyState
            icon={Plane}
            title={t("settings.aircraft.rates.empty.title")}
            description={t("settings.aircraft.rates.empty.description")}
            action={manageAircrafts}
          />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("settings.aircraft.rates.registration")}</TableHead>
                  <TableHead>{t("settings.aircraft.rates.model")}</TableHead>
                  <TableHead className="text-right">{t("settings.aircraft.rates.hourlyRate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aircrafts.map((aircraft) => (
                  <TableRow key={aircraft.id}>
                    <TableCell className="font-medium">{aircraft.registration_number}</TableCell>
                    <TableCell>{aircraft.model || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {aircraft.hourly_cost === null || aircraft.hourly_cost === undefined
                        ? "—"
                        : t("settings.aircraft.rates.perHour", { amount: formatMoney(aircraft.hourly_cost) })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SettingsSection>
    </div>
  )
}
