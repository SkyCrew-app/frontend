"use client"

import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { FuelTank, Station } from "@/lib/navplan/types"
import {
  massFromKg,
  massToKg,
  roundTo,
  volumeFromL,
  volumeToL,
  type MassUnit,
  type VolumeUnit,
} from "@/lib/navplan/units"
import { NumberField } from "./NumberField"

interface LoadEditorProps {
  stations: Station[]
  tanks: FuelTank[]
  loads: Record<string, number | null>
  fuel: Record<string, number | null>
  onLoadChange: (stationId: string, massKg: number | null) => void
  onFuelChange: (tankId: string, litres: number | null) => void
  massUnit: MassUnit
  volumeUnit: VolumeUnit
  onMassUnitChange: (unit: MassUnit) => void
  onVolumeUnitChange: (unit: VolumeUnit) => void
}

/** Masses on board (seats, baggage) and fuel per tank, as weighed for this flight. */
export function LoadEditor({
  stations,
  tanks,
  loads,
  fuel,
  onLoadChange,
  onFuelChange,
  massUnit,
  volumeUnit,
  onMassUnitChange,
  onVolumeUnitChange,
}: LoadEditorProps) {
  const { t } = useTranslation("navplan")
  const loadStations = stations.filter((station) => station.kind !== "FUEL")
  const seats = loadStations.filter((station) => station.kind === "SEAT")
  const others = loadStations.filter((station) => station.kind !== "SEAT")

  const stationField = (station: Station) => {
    const value = loads[station.id]
    const max = station.maxKg ?? null
    const over = value !== null && value !== undefined && max !== null && value > max
    return (
      <div key={station.id} className="space-y-1">
        <Label htmlFor={`load-${station.id}`}>{t("load.stationLabel", { station: station.label, unit: massUnit })}</Label>
        <NumberField
          id={`load-${station.id}`}
          value={value === null || value === undefined ? null : roundTo(massFromKg(value, massUnit), 1)}
          unit={massUnit}
          digits={1}
          invalid={over}
          aria-describedby={max !== null ? `load-${station.id}-max` : undefined}
          onValueChange={(next) => onLoadChange(station.id, next === null ? null : massToKg(next, massUnit))}
        />
        {max !== null && (
          <p id={`load-${station.id}-max`} className={over ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
            {t("load.max", { value: roundTo(massFromKg(max, massUnit), 0), unit: massUnit })}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground" id="mass-unit-label">
            {t("load.massUnit")}
          </span>
          <ToggleGroup
            type="single"
            size="sm"
            value={massUnit}
            onValueChange={(value) => value && onMassUnitChange(value as MassUnit)}
            aria-labelledby="mass-unit-label"
          >
            <ToggleGroupItem value="kg">kg</ToggleGroupItem>
            <ToggleGroupItem value="lb">lb</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground" id="volume-unit-label">
            {t("load.volumeUnit")}
          </span>
          <ToggleGroup
            type="single"
            size="sm"
            value={volumeUnit}
            onValueChange={(value) => value && onVolumeUnitChange(value as VolumeUnit)}
            aria-labelledby="volume-unit-label"
          >
            <ToggleGroupItem value="L">L</ToggleGroupItem>
            <ToggleGroupItem value="USG">USG</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {seats.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">{t("load.people")}</legend>
          <p className="text-xs text-muted-foreground">{t("load.realMasses")}</p>
          <div className="grid gap-4 sm:grid-cols-2">{seats.map(stationField)}</div>
        </fieldset>
      )}

      {others.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">{t("load.baggage")}</legend>
          <div className="grid gap-4 sm:grid-cols-2">{others.map(stationField)}</div>
        </fieldset>
      )}

      {tanks.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">{t("load.fuel")}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {tanks.map((tank) => {
              const value = fuel[tank.id]
              const over = value !== null && value !== undefined && value > tank.usableL + 1e-6
              return (
                <div key={tank.id} className="space-y-1">
                  <Label htmlFor={`fuel-${tank.id}`}>{t("load.tankLabel", { tank: tank.label, unit: volumeUnit })}</Label>
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <NumberField
                        id={`fuel-${tank.id}`}
                        value={value === null || value === undefined ? null : roundTo(volumeFromL(value, volumeUnit), 1)}
                        unit={volumeUnit}
                        digits={1}
                        invalid={over}
                        aria-describedby={`fuel-${tank.id}-usable`}
                        onValueChange={(next) => onFuelChange(tank.id, next === null ? null : volumeToL(next, volumeUnit))}
                      />
                    </div>
                    <Button type="button" variant="outline" onClick={() => onFuelChange(tank.id, tank.usableL)}>
                      {t("load.full")}
                    </Button>
                  </div>
                  <p id={`fuel-${tank.id}-usable`} className={over ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                    {t("load.usable", { value: roundTo(volumeFromL(tank.usableL, volumeUnit), 1), unit: volumeUnit })}
                  </p>
                </div>
              )
            })}
          </div>
        </fieldset>
      )}
    </div>
  )
}
