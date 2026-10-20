"use client"

import { Fragment } from "react"
import { useTranslation } from "react-i18next"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberField } from "@/components/navplan/NumberField"
import { emptyDistanceTable, distanceTableIssues } from "@/lib/navplan/aircraft-data"
import type { DistanceRow, RunwayDistanceTable } from "@/lib/navplan/types"

type Kind = "takeoff" | "landing"

const CORRECTIONS = ["headwindPercentPerKt", "tailwindPercentPerKt", "grassPercent", "wetGrassPercent", "slopePercentPerPercent"] as const

/**
 * A take-off or landing table of the flight manual: one card per line of the table (pressure
 * altitude, temperature, mass when the manual gives several, ground roll, distance at 15 m) that
 * wraps on a phone, and the manual's own corrections. Nothing scrolls inside: the page does.
 */
export function DistanceTableEditor({ kind, value, onChange }: { kind: Kind; value: RunwayDistanceTable | null | undefined; onChange: (value: RunwayDistanceTable | null) => void }) {
  const { t } = useTranslation("navplan")
  const id = `perf-${kind}`
  if (!value) {
    return (
      <div className="space-y-2 rounded-lg border border-dashed p-3">
        <p className="text-sm font-medium text-warning">{t("aircraftData.distances.notEntered")}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(emptyDistanceTable())}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t(`aircraftData.distances.${kind}.enter`)}
        </Button>
      </div>
    )
  }

  const issues = distanceTableIssues(value)
  const setRow = (index: number, row: DistanceRow) => onChange({ ...value, rows: value.rows.map((current, i) => (i === index ? row : current)) })
  const addRow = () => {
    const last = value.rows.at(-1)
    onChange({
      ...value,
      rows: [
        ...value.rows,
        last
          ? { ...last, temperatureC: last.temperatureC + 10 }
          : { pressureAltFt: 0, temperatureC: 0, massKg: null, groundRollM: Number.NaN, distance15mM: Number.NaN },
      ],
    })
  }
  const field = (key: string, label: string, current: number | null | undefined, onValue: (next: number | null) => void, unit?: string, digits = 0, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`${id}-${key}`}>{unit ? `${label} (${unit})` : label}</Label>
      <NumberField id={`${id}-${key}`} value={current ?? null} unit={unit} digits={digits} onValueChange={onValue} aria-describedby={hint ? `${id}-${key}-hint` : undefined} />
      {hint && (
        <p id={`${id}-${key}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )

  return (
    <div className="space-y-4 rounded-lg border p-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {field("reference-mass", t("aircraftData.distances.referenceMass"), value.referenceMassKg, (next) => onChange({ ...value, referenceMassKg: next }), "kg", 0, t("aircraftData.distances.referenceMassHint"))}
        {field("speed", t(`aircraftData.distances.${kind}.speed`), value.speedKt, (next) => onChange({ ...value, speedKt: next }), "kt", 0, t("aircraftData.distances.speedHint"))}
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-source`}>{t("aircraftData.distances.source")}</Label>
          <Input id={`${id}-source`} value={value.source ?? ""} placeholder={t("aircraftData.distances.sourcePlaceholder")} onChange={(event) => onChange({ ...value, source: event.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("aircraftData.distances.rows")}</p>
        {value.rows.length === 0 && <p className="text-sm text-muted-foreground">{t("aircraftData.distances.noRow")}</p>}
        <ol className="space-y-2">
          {value.rows.map((row, index) => {
            const label = (column: string) => t("editor.cellLabel", { column, row: index + 1 })
            const cells: { key: keyof DistanceRow; text: string; unit: string; optional?: boolean }[] = [
              { key: "pressureAltFt", text: t("aircraftData.distances.pressureAlt"), unit: "ft" },
              { key: "temperatureC", text: t("aircraftData.distances.temperature"), unit: "°C" },
              { key: "massKg", text: t("aircraftData.distances.mass"), unit: "kg", optional: true },
              { key: "groundRollM", text: t("aircraftData.distances.groundRoll"), unit: "m" },
              { key: "distance15mM", text: t(`aircraftData.distances.${kind}.distance15m`), unit: "m" },
            ]
            return (
              <li key={index} className="flex items-end gap-2 rounded-md bg-muted/40 p-2">
                <span className="w-6 shrink-0 pb-2 text-xs tabular-nums text-muted-foreground" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {cells.map((cell) => (
                    <div key={cell.key} className="min-w-0 space-y-1">
                      <span className="block text-xs text-muted-foreground" aria-hidden="true">
                        {cell.text}
                        {cell.optional ? ` (${t("aircraftData.distances.optional")})` : ""}
                      </span>
                      <NumberField
                        id={`${id}-${index}-${cell.key}`}
                        aria-label={`${label(cell.text)} (${cell.unit})`}
                        className="h-8"
                        unit={cell.unit}
                        digits={0}
                        value={row[cell.key] as number | null | undefined}
                        onValueChange={(next) =>
                          setRow(index, { ...row, [cell.key]: cell.optional ? next : (next ?? Number.NaN) })
                        }
                      />
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label={t("editor.removeRow", { row: index + 1 })}
                  title={t("editor.removeRowShort")}
                  onClick={() => onChange({ ...value, rows: value.rows.filter((_, i) => i !== index) })}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </li>
            )
          })}
        </ol>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("aircraftData.distances.addRow")}
        </Button>
        {issues.length > 0 && (
          <p className="text-sm text-destructive" role="status">
            {issues.map((issue) => t(`aircraftData.distances.issue.${issue}`)).join(" ")}
          </p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("aircraftData.distances.corrections")}</legend>
        <p className="text-xs text-muted-foreground">{t("aircraftData.distances.correctionsHint")}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CORRECTIONS.map((key) => (
            <Fragment key={key}>
              {field(key, t(`aircraftData.distances.correction.${key}`), value[key], (next) => onChange({ ...value, [key]: next }), t(`aircraftData.distances.correctionUnit.${key}`), 2)}
            </Fragment>
          ))}
        </div>
      </fieldset>

      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onChange(null)}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {t(`aircraftData.distances.${kind}.remove`)}
      </Button>
    </div>
  )
}
