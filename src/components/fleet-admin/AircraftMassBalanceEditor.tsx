"use client"

import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NumberField } from "@/components/navplan/NumberField"
import { formatDecimal } from "@/lib/format"
import { makeId, type MassBalanceProblem, type Problem } from "@/lib/navplan/aircraft-data"
import type { AircraftMassBalanceInput, EnvelopeCategory, FuelTank, Station, StationKind } from "@/lib/navplan/types"
import { armFromM, armToM, massFromKg, massToKg, roundTo, type ArmUnit, type MassUnit } from "@/lib/navplan/units"
import { EditableTable } from "./flight-data/EditableTable"
import { EnvelopeEditor } from "./flight-data/EnvelopeEditor"

interface AircraftMassBalanceEditorProps {
  value: AircraftMassBalanceInput
  onChange: (value: AircraftMassBalanceInput) => void
  tanks: FuelTank[]
  armUnit: ArmUnit
  massUnit: MassUnit
  problems: Problem<MassBalanceProblem>[]
  showProblems: boolean
}

const KINDS: StationKind[] = ["SEAT", "BAGGAGE", "FUEL", "OTHER"]
const CATEGORIES: EnvelopeCategory[] = ["NORMAL", "UTILITY", "AEROBATIC"]
const ARM_DIGITS: Record<ArmUnit, number> = { m: 4, mm: 1, in: 2 }

/** Weighing report, mass limits, loading stations and envelopes of one aircraft. */
export function AircraftMassBalanceEditor({ value, onChange, tanks, armUnit, massUnit, problems, showProblems }: AircraftMassBalanceEditorProps) {
  const { t } = useTranslation("navplan")
  const has = (code: MassBalanceProblem) => showProblems && problems.some((problem) => problem.code === code)
  const set = <K extends keyof AircraftMassBalanceInput>(key: K, next: AircraftMassBalanceInput[K]) => onChange({ ...value, [key]: next })
  const mass = (kg: number | null | undefined) => (kg === null || kg === undefined ? null : roundTo(massFromKg(kg, massUnit), 1))
  const arm = (m: number | null | undefined) => (m === null || m === undefined ? null : roundTo(armFromM(m, armUnit), ARM_DIGITS[armUnit]))
  const usedCategories = value.envelopes.map((envelope) => envelope.category)

  const field = (id: string, label: string, error: MassBalanceProblem | MassBalanceProblem[] | null, control: React.ReactNode, hint?: string) => {
    const codes = error === null ? [] : Array.isArray(error) ? error : [error]
    const shown = codes.find(has)
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        {control}
        {shown ? (
          <p id={`${id}-error`} className="text-sm text-destructive">
            {t(`aircraftData.problem.${shown}`)}
          </p>
        ) : hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4" aria-labelledby="mb-weighing">
        <div>
          <h3 id="mb-weighing" className="text-base font-semibold">
            {t("aircraftData.weighing.title")}
          </h3>
          <p className="text-sm text-muted-foreground">{t("aircraftData.weighing.description")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {field(
            "mb-empty-mass",
            t("aircraftData.weighing.emptyMass", { unit: massUnit }),
            "EMPTY_MASS",
            <NumberField id="mb-empty-mass" value={mass(value.emptyMassKg)} unit={massUnit} digits={1} invalid={has("EMPTY_MASS")} onValueChange={(next) => set("emptyMassKg", massToKg(next ?? 0, massUnit))} />,
          )}
          {field(
            "mb-empty-arm",
            t("aircraftData.weighing.emptyArm", { unit: armUnit }),
            "EMPTY_ARM",
            <NumberField id="mb-empty-arm" value={arm(value.emptyArmM)} unit={armUnit} digits={ARM_DIGITS[armUnit]} invalid={has("EMPTY_ARM")} onValueChange={(next) => set("emptyArmM", armToM(next ?? Number.NaN, armUnit))} />,
            t("aircraftData.weighing.emptyMoment", {
              value: formatDecimal((value.emptyMassKg || 0) * (value.emptyArmM || 0), 1),
            }),
          )}
          {field(
            "mb-weighing-date",
            t("aircraftData.weighing.date"),
            "WEIGHING_DATE",
            <Input id="mb-weighing-date" type="date" value={value.weighingDate.slice(0, 10)} aria-invalid={has("WEIGHING_DATE") || undefined} onChange={(event) => set("weighingDate", event.target.value)} />,
          )}
          {field(
            "mb-weighing-ref",
            t("aircraftData.weighing.reference"),
            null,
            <Input id="mb-weighing-ref" value={value.weighingRef ?? ""} placeholder={t("aircraftData.weighing.referencePlaceholder")} onChange={(event) => set("weighingRef", event.target.value)} />,
          )}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="mb-limits">
        <h3 id="mb-limits" className="text-base font-semibold">
          {t("aircraftData.limits.title")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {field(
            "mb-mtow",
            t("aircraftData.limits.mtow", { unit: massUnit }),
            "MTOW",
            <NumberField id="mb-mtow" value={mass(value.mtowKg)} unit={massUnit} digits={1} invalid={has("MTOW")} onValueChange={(next) => set("mtowKg", massToKg(next ?? 0, massUnit))} />,
          )}
          {field(
            "mb-mlw",
            t("aircraftData.limits.mlw", { unit: massUnit }),
            ["MLW", "MLW_ABOVE_MTOW"],
            <NumberField id="mb-mlw" value={mass(value.mlwKg)} unit={massUnit} digits={1} invalid={has("MLW") || has("MLW_ABOVE_MTOW")} onValueChange={(next) => set("mlwKg", massToKg(next ?? 0, massUnit))} />,
            t("aircraftData.limits.mlwHint"),
          )}
          {field(
            "mb-mzfw",
            t("aircraftData.limits.mzfw", { unit: massUnit }),
            null,
            <NumberField id="mb-mzfw" value={mass(value.mzfwKg)} unit={massUnit} digits={1} onValueChange={(next) => set("mzfwKg", next === null ? null : massToKg(next, massUnit))} />,
            t("aircraftData.limits.optional"),
          )}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="mb-stations">
        <div>
          <h3 id="mb-stations" className="text-base font-semibold">
            {t("aircraftData.stations.title")}
          </h3>
          <p className="text-sm text-muted-foreground">{t("aircraftData.stations.description")}</p>
        </div>
        <EditableTable<Station>
          id="mb-stations-table"
          caption={t("aircraftData.stations.title")}
          rows={value.stations}
          onChange={(stations) => set("stations", stations)}
          reorderable
          addLabel={t("aircraftData.stations.add")}
          newRow={() => {
            const label = t("aircraftData.stations.newLabel", { count: value.stations.length + 1 })
            return { id: makeId(label, value.stations.map((station) => station.id)), label, kind: "SEAT", armM: 0, maxKg: null, tankId: null }
          }}
          invalidRows={
            showProblems
              ? value.stations
                  .map((station, index) => (problems.some((problem) => problem.target === station.id) ? index : -1))
                  .filter((index) => index >= 0)
              : []
          }
          columns={[
            {
              key: "label",
              label: t("aircraftData.stations.label"),
              kind: "text",
              read: (station) => station.label,
              write: (station, next) => ({ ...station, label: String(next ?? "") }),
            },
            {
              key: "kind",
              label: t("aircraftData.stations.kind"),
              read: (station) => station.kind,
              write: (station) => station,
              render: (station, index, update) => (
                <Select value={station.kind} onValueChange={(kind) => update({ ...station, kind: kind as StationKind, tankId: kind === "FUEL" ? (station.tankId ?? tanks[0]?.id ?? null) : null })}>
                  <SelectTrigger className="h-8 min-w-[8rem]" aria-label={t("editor.cellLabel", { column: t("aircraftData.stations.kind"), row: index + 1 })}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {t(`stationKind.${kind}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ),
            },
            {
              key: "arm",
              label: t("aircraftData.stations.arm"),
              unit: armUnit,
              digits: ARM_DIGITS[armUnit],
              read: (station) => arm(station.armM),
              write: (station, next) => ({ ...station, armM: armToM(Number(next ?? 0), armUnit) }),
            },
            {
              key: "max",
              label: t("aircraftData.stations.max"),
              unit: massUnit,
              digits: 1,
              read: (station) => mass(station.maxKg),
              write: (station, next) => ({ ...station, maxKg: next === null ? null : massToKg(Number(next), massUnit) }),
            },
            {
              key: "tank",
              label: t("aircraftData.stations.tank"),
              read: (station) => station.tankId ?? "",
              write: (station) => station,
              render: (station, index, update) =>
                station.kind === "FUEL" ? (
                  <Select value={station.tankId ?? ""} onValueChange={(tankId) => update({ ...station, tankId })}>
                    <SelectTrigger className="h-8 min-w-[8rem]" aria-label={t("editor.cellLabel", { column: t("aircraftData.stations.tank"), row: index + 1 })}>
                      <SelectValue placeholder={t("aircraftData.stations.chooseTank")} />
                    </SelectTrigger>
                    <SelectContent>
                      {tanks.map((tank) => (
                        <SelectItem key={tank.id} value={tank.id}>
                          {tank.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="px-2 text-xs text-muted-foreground">—</span>
                ),
            },
          ]}
        />
      </section>

      <section className="space-y-3" aria-labelledby="mb-combined">
        <div>
          <h3 id="mb-combined" className="text-base font-semibold">
            {t("aircraftData.combined.title")}
          </h3>
          <p className="text-sm text-muted-foreground">{t("aircraftData.combined.description")}</p>
        </div>
        <EditableTable
          id="mb-combined-table"
          caption={t("aircraftData.combined.title")}
          rows={value.combinedLimits}
          onChange={(combinedLimits) => set("combinedLimits", combinedLimits)}
          addLabel={t("aircraftData.combined.add")}
          newRow={() => ({ label: "", stationIds: [], maxKg: 0 })}
          emptyText={t("aircraftData.combined.none")}
          invalidRows={showProblems ? problems.filter((problem) => problem.code === "COMBINED_LIMIT").map((problem) => Number(problem.target)) : []}
          columns={[
            {
              key: "label",
              label: t("aircraftData.combined.label"),
              kind: "text",
              read: (limit) => limit.label,
              write: (limit, next) => ({ ...limit, label: String(next ?? "") }),
            },
            {
              key: "stations",
              label: t("aircraftData.combined.stations"),
              read: () => "",
              write: (limit) => limit,
              render: (limit, index, update) => (
                <fieldset className="flex flex-wrap gap-x-3 gap-y-1 px-1">
                  <legend className="sr-only">{t("editor.cellLabel", { column: t("aircraftData.combined.stations"), row: index + 1 })}</legend>
                  {value.stations.map((station) => (
                    <label key={station.id} className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={limit.stationIds.includes(station.id)}
                        onCheckedChange={(checked) =>
                          update({
                            ...limit,
                            stationIds: checked ? [...limit.stationIds, station.id] : limit.stationIds.filter((id) => id !== station.id),
                          })
                        }
                      />
                      {station.label}
                    </label>
                  ))}
                </fieldset>
              ),
            },
            {
              key: "max",
              label: t("aircraftData.combined.max"),
              unit: massUnit,
              digits: 1,
              read: (limit) => mass(limit.maxKg),
              write: (limit, next) => ({ ...limit, maxKg: massToKg(Number(next ?? 0), massUnit) }),
            },
          ]}
        />
      </section>

      <section className="space-y-3" aria-labelledby="mb-envelopes">
        <div>
          <h3 id="mb-envelopes" className="text-base font-semibold">
            {t("aircraftData.envelope.sectionTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">{t("aircraftData.envelope.sectionDescription")}</p>
          {has("ENVELOPE") && <p className="mt-1 text-sm text-destructive">{t("aircraftData.problem.ENVELOPE")}</p>}
        </div>
        {value.envelopes.map((envelope, index) => (
          <EnvelopeEditor
            key={`${envelope.category}-${index}`}
            index={index}
            envelope={envelope}
            usedCategories={usedCategories}
            armUnit={armUnit}
            massUnit={massUnit}
            emptyPoint={value.emptyMassKg > 0 && Number.isFinite(value.emptyArmM) ? { armM: value.emptyArmM, massKg: value.emptyMassKg } : null}
            onChange={(next) => set("envelopes", value.envelopes.map((current, i) => (i === index ? next : current)))}
            onRemove={value.envelopes.length > 1 ? () => set("envelopes", value.envelopes.filter((_, i) => i !== index)) : undefined}
          />
        ))}
        {usedCategories.length < CATEGORIES.length && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              set("envelopes", [
                ...value.envelopes,
                { category: CATEGORIES.find((category) => !usedCategories.includes(category)) ?? "UTILITY", points: [] },
              ])
            }
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("aircraftData.envelope.add")}
          </Button>
        )}
      </section>
    </div>
  )
}
