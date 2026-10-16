"use client"

import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NumberField } from "@/components/navplan/NumberField"
import { FUEL_DENSITY, makeId, type PerformanceProblem, type Problem } from "@/lib/navplan/aircraft-data"
import type { AircraftPerformanceInput, FuelTank, FuelType } from "@/lib/navplan/types"
import { armFromM, armToM, roundTo, volumeFromL, volumeToL, type ArmUnit, type VolumeUnit } from "@/lib/navplan/units"
import { EditableTable } from "./flight-data/EditableTable"

interface AircraftPerformanceEditorProps {
  value: AircraftPerformanceInput
  onChange: (value: AircraftPerformanceInput) => void
  armUnit: ArmUnit
  volumeUnit: VolumeUnit
  problems: Problem<PerformanceProblem>[]
  showProblems: boolean
}

const FUEL_TYPES: FuelType[] = ["AVGAS_100LL", "UL91", "JET_A1", "MOGAS"]
const ARM_DIGITS: Record<ArmUnit, number> = { m: 4, mm: 1, in: 2 }

/** The performance pages of the flight manual: fuel, climb, cruise, descent, reserve flows. */
export function AircraftPerformanceEditor({ value, onChange, armUnit, volumeUnit, problems, showProblems }: AircraftPerformanceEditorProps) {
  const { t } = useTranslation("navplan")
  const has = (code: PerformanceProblem) => showProblems && problems.some((problem) => problem.code === code)
  const vol = (litres: number | null | undefined) => (litres === null || litres === undefined ? null : roundTo(volumeFromL(litres, volumeUnit), 1))
  const flowUnit = `${volumeUnit}/h`
  const useTable = value.climb.table !== null && value.climb.table !== undefined
  const settings = [...new Set(value.cruise.rows.map((row) => row.setting).filter(Boolean))]

  const problem = (code: PerformanceProblem) =>
    has(code) ? (
      <p className="text-sm text-destructive" role="status">
        {t(`aircraftData.problem.${code}`)}
      </p>
    ) : null

  const numberField = (id: string, label: string, current: number | null | undefined, onValue: (next: number | null) => void, unit?: string, digits = 1, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{unit ? `${label} (${unit})` : label}</Label>
      <NumberField id={id} value={current ?? null} unit={unit} digits={digits} onValueChange={onValue} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )

  return (
    <div className="space-y-8">
      <Section id="perf-fuel" title={t("aircraftData.fuel.title")} description={t("aircraftData.fuel.description")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="perf-fuel-type">{t("aircraftData.fuel.type")}</Label>
            <Select
              value={value.fuel.type}
              onValueChange={(type) =>
                onChange({ ...value, fuel: { ...value.fuel, type: type as FuelType, densityKgPerL: FUEL_DENSITY[type as FuelType] } })
              }
            >
              <SelectTrigger id="perf-fuel-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUEL_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`fuelType.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {numberField(
            "perf-density",
            t("aircraftData.fuel.density"),
            value.fuel.densityKgPerL,
            (next) => onChange({ ...value, fuel: { ...value.fuel, densityKgPerL: next ?? 0 } }),
            "kg/L",
            3,
            t("aircraftData.fuel.densityHint"),
          )}
          {numberField(
            "perf-taxi",
            t("aircraftData.fuel.taxi"),
            vol(value.fuel.taxiFuelL),
            (next) => onChange({ ...value, fuel: { ...value.fuel, taxiFuelL: volumeToL(next ?? 0, volumeUnit) } }),
            volumeUnit,
            1,
            t("aircraftData.fuel.taxiHint"),
          )}
          {numberField(
            "perf-arrival",
            t("aircraftData.fuel.arrival"),
            vol(value.arrivalFuelL),
            (next) => onChange({ ...value, arrivalFuelL: volumeToL(next ?? 0, volumeUnit) }),
            volumeUnit,
            1,
            t("aircraftData.fuel.arrivalHint"),
          )}
        </div>
        {problem("DENSITY")}
        <EditableTable<FuelTank>
          id="perf-tanks"
          caption={t("aircraftData.fuel.tanks")}
          rows={value.fuel.tanks}
          onChange={(tanks) =>
            onChange({
              ...value,
              fuel: { ...value.fuel, tanks, burnOrder: value.fuel.burnOrder.length > 0 ? tanks.map((tank) => tank.id) : [] },
            })
          }
          reorderable
          addLabel={t("aircraftData.fuel.addTank")}
          newRow={() => {
            const label = t("aircraftData.fuel.newTank", { count: value.fuel.tanks.length + 1 })
            return { id: makeId(label, value.fuel.tanks.map((tank) => tank.id)), label, usableL: 0, unusableL: 0, armM: 0 }
          }}
          columns={[
            { key: "label", label: t("aircraftData.fuel.tankLabel"), kind: "text", read: (tank) => tank.label, write: (tank, next) => ({ ...tank, label: String(next ?? "") }) },
            { key: "usable", label: t("aircraftData.fuel.usable"), unit: volumeUnit, digits: 1, read: (tank) => vol(tank.usableL), write: (tank, next) => ({ ...tank, usableL: volumeToL(Number(next ?? 0), volumeUnit) }) },
            { key: "unusable", label: t("aircraftData.fuel.unusable"), unit: volumeUnit, digits: 1, read: (tank) => vol(tank.unusableL), write: (tank, next) => ({ ...tank, unusableL: volumeToL(Number(next ?? 0), volumeUnit) }) },
            {
              key: "arm",
              label: t("aircraftData.fuel.arm"),
              unit: armUnit,
              digits: ARM_DIGITS[armUnit],
              read: (tank) => roundTo(armFromM(tank.armM, armUnit), ARM_DIGITS[armUnit]),
              write: (tank, next) => ({ ...tank, armM: armToM(Number(next ?? 0), armUnit) }),
            },
          ]}
        />
        {problem("TANKS")}
        {value.fuel.tanks.length > 1 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("aircraftData.fuel.burnOrder")}</legend>
            <RadioGroup
              value={value.fuel.burnOrder.length > 0 ? "ordered" : "proportional"}
              onValueChange={(mode) =>
                onChange({ ...value, fuel: { ...value.fuel, burnOrder: mode === "ordered" ? value.fuel.tanks.map((tank) => tank.id) : [] } })
              }
              className="flex flex-wrap gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="proportional" />
                {t("aircraftData.fuel.proportional")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="ordered" />
                {t("aircraftData.fuel.ordered")}
              </label>
            </RadioGroup>
          </fieldset>
        )}
      </Section>

      <Section id="perf-climb" title={t("aircraftData.climb.title")} description={t("aircraftData.climb.description")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {numberField("perf-climb-ias", t("aircraftData.climb.ias"), value.climb.iasKt, (next) => onChange({ ...value, climb: { ...value.climb, iasKt: Math.round(next ?? 0) } }), "kt", 0)}
        </div>
        <RadioGroup
          value={useTable ? "table" : "simple"}
          aria-label={t("aircraftData.climb.mode")}
          onValueChange={(mode) => onChange({ ...value, climb: { ...value.climb, table: mode === "table" ? (value.climb.table ?? []) : null } })}
          className="flex flex-wrap gap-4"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="table" />
            {t("aircraftData.climb.table")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="simple" />
            {t("aircraftData.climb.simple")}
          </label>
        </RadioGroup>
        {useTable ? (
          <EditableTable
            id="perf-climb-table"
            caption={t("aircraftData.climb.table")}
            rows={value.climb.table ?? []}
            onChange={(table) => onChange({ ...value, climb: { ...value.climb, table } })}
            addLabel={t("aircraftData.climb.addRow")}
            newRow={() => ({ pressureAltFt: (value.climb.table?.at(-1)?.pressureAltFt ?? -2000) + 2000, timeMin: 0, fuelL: 0, distanceNm: 0 })}
            columns={[
              { key: "zp", label: t("aircraftData.climb.pressureAlt"), unit: "ft", digits: 0, read: (row) => row.pressureAltFt, write: (row, next) => ({ ...row, pressureAltFt: Math.round(Number(next ?? 0)) }) },
              { key: "time", label: t("aircraftData.climb.time"), unit: "min", digits: 1, read: (row) => row.timeMin, write: (row, next) => ({ ...row, timeMin: Number(next ?? 0) }) },
              { key: "fuel", label: t("aircraftData.climb.fuel"), unit: volumeUnit, digits: 1, read: (row) => vol(row.fuelL), write: (row, next) => ({ ...row, fuelL: volumeToL(Number(next ?? 0), volumeUnit) }) },
              { key: "distance", label: t("aircraftData.climb.distance"), unit: "NM", digits: 1, read: (row) => row.distanceNm, write: (row, next) => ({ ...row, distanceNm: Number(next ?? 0) }) },
            ]}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {numberField("perf-climb-sl", t("aircraftData.climb.seaLevelRate"), value.climb.seaLevelRateFpm, (next) => onChange({ ...value, climb: { ...value.climb, seaLevelRateFpm: next === null ? null : Math.round(next) } }), "ft/min", 0)}
            {numberField("perf-climb-ceiling", t("aircraftData.climb.ceilingRate"), value.climb.ceilingRateFpm, (next) => onChange({ ...value, climb: { ...value.climb, ceilingRateFpm: next === null ? null : Math.round(next) } }), "ft/min", 0)}
            {numberField("perf-climb-flow", t("aircraftData.climb.fuelFlow"), vol(value.climb.fuelFlowLph), (next) => onChange({ ...value, climb: { ...value.climb, fuelFlowLph: next === null ? null : volumeToL(next, volumeUnit) } }), flowUnit, 1)}
          </div>
        )}
        {problem("CLIMB")}
      </Section>

      <Section id="perf-cruise" title={t("aircraftData.cruise.title")} description={t("aircraftData.cruise.description")}>
        <EditableTable
          id="perf-cruise-table"
          caption={t("aircraftData.cruise.title")}
          rows={value.cruise.rows}
          onChange={(rows) => onChange({ ...value, cruise: { ...value.cruise, rows } })}
          addLabel={t("aircraftData.cruise.addRow")}
          newRow={() => ({ pressureAltFt: 2000, setting: value.cruise.normalSetting || "", isaDeviationC: 0, tasKt: 0, fuelFlowLph: 0 })}
          columns={[
            { key: "zp", label: t("aircraftData.cruise.pressureAlt"), unit: "ft", digits: 0, read: (row) => row.pressureAltFt, write: (row, next) => ({ ...row, pressureAltFt: Math.round(Number(next ?? 0)) }) },
            { key: "setting", label: t("aircraftData.cruise.setting"), kind: "text", read: (row) => row.setting, write: (row, next) => ({ ...row, setting: String(next ?? "") }) },
            { key: "isa", label: t("aircraftData.cruise.isa"), unit: "°C", digits: 0, read: (row) => row.isaDeviationC, write: (row, next) => ({ ...row, isaDeviationC: Math.round(Number(next ?? 0)) }) },
            { key: "tas", label: t("aircraftData.cruise.tas"), unit: "kt", digits: 0, read: (row) => row.tasKt, write: (row, next) => ({ ...row, tasKt: Number(next ?? 0) }) },
            { key: "flow", label: t("aircraftData.cruise.fuelFlow"), unit: flowUnit, digits: 1, read: (row) => vol(row.fuelFlowLph), write: (row, next) => ({ ...row, fuelFlowLph: volumeToL(Number(next ?? 0), volumeUnit) }) },
          ]}
        />
        {problem("CRUISE")}
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="perf-normal-setting">{t("aircraftData.cruise.normalSetting")}</Label>
          <Select value={value.cruise.normalSetting || undefined} onValueChange={(normalSetting) => onChange({ ...value, cruise: { ...value.cruise, normalSetting } })}>
            <SelectTrigger id="perf-normal-setting" aria-invalid={has("NORMAL_SETTING") || undefined}>
              <SelectValue placeholder={t("aircraftData.cruise.chooseSetting")} />
            </SelectTrigger>
            <SelectContent>
              {settings.map((setting) => (
                <SelectItem key={setting} value={setting}>
                  {setting}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {problem("NORMAL_SETTING")}
        </div>
      </Section>

      <Section id="perf-descent" title={t("aircraftData.descent.title")} description={t("aircraftData.descent.description")}>
        <div className="grid gap-4 sm:grid-cols-3">
          {numberField("perf-descent-ias", t("aircraftData.descent.ias"), value.descent.iasKt, (next) => onChange({ ...value, descent: { ...value.descent, iasKt: Math.round(next ?? 0) } }), "kt", 0)}
          {numberField("perf-descent-rate", t("aircraftData.descent.rate"), value.descent.rateFpm, (next) => onChange({ ...value, descent: { ...value.descent, rateFpm: Math.round(next ?? 0) } }), "ft/min", 0)}
          {numberField("perf-descent-flow", t("aircraftData.descent.fuelFlow"), vol(value.descent.fuelFlowLph), (next) => onChange({ ...value, descent: { ...value.descent, fuelFlowLph: volumeToL(next ?? 0, volumeUnit) } }), flowUnit, 1)}
        </div>
        {problem("DESCENT")}
      </Section>

      <Section id="perf-reserve" title={t("aircraftData.reserve.title")} description={t("aircraftData.reserve.description")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {numberField("perf-holding", t("aircraftData.reserve.holding"), vol(value.reserve.holdingFuelFlowLph), (next) => onChange({ ...value, reserve: { ...value.reserve, holdingFuelFlowLph: volumeToL(next ?? 0, volumeUnit) } }), flowUnit, 1, t("aircraftData.reserve.holdingHint"))}
          {numberField("perf-mcp", t("aircraftData.reserve.maxContinuous"), vol(value.reserve.maxContinuousFuelFlowLph), (next) => onChange({ ...value, reserve: { ...value.reserve, maxContinuousFuelFlowLph: volumeToL(next ?? 0, volumeUnit) } }), flowUnit, 1, t("aircraftData.reserve.maxContinuousHint"))}
        </div>
        {problem("RESERVE")}
      </Section>

      <Section id="perf-other" title={t("aircraftData.other.title")} description={t("aircraftData.other.description")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {numberField("perf-ceiling", t("aircraftData.other.serviceCeiling"), value.serviceCeilingFt, (next) => onChange({ ...value, serviceCeilingFt: next === null ? null : Math.round(next) }), "ft", 0)}
          <div className="space-y-1.5">
            <Label htmlFor="perf-source">{t("aircraftData.other.source")}</Label>
            <Input id="perf-source" value={value.source ?? ""} placeholder={t("aircraftData.other.sourcePlaceholder")} onChange={(event) => onChange({ ...value, source: event.target.value })} />
          </div>
        </div>
        <EditableTable
          id="perf-calibration"
          caption={t("aircraftData.other.calibration")}
          rows={value.calibration}
          onChange={(calibration) => onChange({ ...value, calibration })}
          addLabel={t("aircraftData.other.addCalibration")}
          emptyText={t("aircraftData.other.noCalibration")}
          newRow={() => ({ iasKt: 0, casKt: 0 })}
          columns={[
            { key: "ias", label: t("aircraftData.other.ias"), unit: "kt", digits: 0, read: (row) => row.iasKt, write: (row, next) => ({ ...row, iasKt: Number(next ?? 0) }) },
            { key: "cas", label: t("aircraftData.other.cas"), unit: "kt", digits: 0, read: (row) => row.casKt, write: (row, next) => ({ ...row, casKt: Number(next ?? 0) }) },
          ]}
        />
      </Section>
    </div>
  )
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4" aria-labelledby={id}>
      <div>
        <h3 id={id} className="text-base font-semibold">
          {title}
        </h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}
