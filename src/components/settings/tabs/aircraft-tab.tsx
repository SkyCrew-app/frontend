"use client"

import Link from "next/link"
import { useQuery } from "@apollo/client"
import { useFormContext } from "react-hook-form"
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
import { FUEL_MANAGEMENT_OPTIONS, type FuelManagement, type SettingsFormValues } from "@/lib/settings"
import { SettingsField, SettingsSection, UnitInput, errorMessage } from "../settings-field"

interface Aircraft {
  id: number | string
  registration_number: string
  model?: string | null
  hourly_cost?: number | null
}

export function AircraftTab() {
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
      <Link href="/administration/planes">Gérer les avions</Link>
    </Button>
  )

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Carburant"
        description="Qui fait le plein, et le prix du litre utilisé pour estimer les coûts d'exploitation."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium leading-none">Gestion du carburant</legend>
            <RadioGroup
              value={fuelManagement}
              onValueChange={(value) => setValue("fuelManagement", value as FuelManagement, { shouldDirty: true })}
              className="gap-3"
            >
              {FUEL_MANAGEMENT_OPTIONS.map((option) => (
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
          <SettingsField id="fuel-price" label="Prix du carburant" required error={errorMessage(errors.fuelPrice)}>
            <UnitInput
              id="fuel-price"
              unit="€/L"
              min="0"
              step="0.01"
              placeholder="2,35"
              aria-invalid={errors.fuelPrice ? true : undefined}
              {...register("fuelPrice", { valueAsNumber: true })}
            />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Tarifs horaires des avions"
        description="Le tarif de chaque avion se modifie dans sa fiche, depuis la gestion des avions."
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
            title="Aucun avion"
            description="Ajoutez les avions du club depuis la gestion des avions."
            action={manageAircrafts}
          />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Immatriculation</TableHead>
                  <TableHead>Modèle</TableHead>
                  <TableHead className="text-right">Tarif horaire</TableHead>
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
                        : `${formatMoney(aircraft.hourly_cost)} / h`}
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
