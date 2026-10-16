"use client"

import { useTranslation } from "react-i18next"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MassBalanceChart, type PlottedPoint } from "@/components/navplan/MassBalanceChart"
import { pointInPolygon, polygonIssues } from "@/lib/navplan/envelope"
import type { Envelope, EnvelopeCategory } from "@/lib/navplan/types"
import { armFromM, armToM, massFromKg, massToKg, roundTo, type ArmUnit, type MassUnit } from "@/lib/navplan/units"
import { EditableTable } from "./EditableTable"

interface EnvelopeEditorProps {
  index: number
  envelope: Envelope
  usedCategories: EnvelopeCategory[]
  armUnit: ArmUnit
  massUnit: MassUnit
  /** Empty aircraft, drawn on the chart as a first sanity check. */
  emptyPoint?: { armM: number; massKg: number } | null
  onChange: (envelope: Envelope) => void
  onRemove?: () => void
}

const CATEGORIES: EnvelopeCategory[] = ["NORMAL", "UTILITY", "AEROBATIC"]
const ARM_DIGITS: Record<ArmUnit, number> = { m: 4, mm: 1, in: 2 }

/** One envelope of the flight manual: its points in order, and the drawing updated as they are typed. */
export function EnvelopeEditor({ index, envelope, usedCategories, armUnit, massUnit, emptyPoint, onChange, onRemove }: EnvelopeEditorProps) {
  const { t } = useTranslation("navplan")
  const issues = polygonIssues(envelope.points)
  const plotted: PlottedPoint[] =
    emptyPoint && emptyPoint.massKg > 0
      ? [
          {
            armM: emptyPoint.armM,
            massKg: emptyPoint.massKg,
            label: t("aircraftData.envelope.emptyShort"),
            name: t("aircraftData.envelope.empty"),
            within: pointInPolygon(emptyPoint, envelope.points),
            shape: "diamond",
          },
        ]
      : []

  return (
    <section className="space-y-3 rounded-lg border p-4" aria-labelledby={`envelope-${index}-title`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h4 id={`envelope-${index}-title`} className="text-sm font-semibold">
          {t("aircraftData.envelope.title", { category: t(`envelopeCategory.${envelope.category}`) })}
        </h4>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor={`envelope-${index}-category`} className="text-xs text-muted-foreground">
              {t("aircraftData.envelope.category")}
            </Label>
            <Select value={envelope.category} onValueChange={(value) => onChange({ ...envelope, category: value as EnvelopeCategory })}>
              <SelectTrigger id={`envelope-${index}-category`} className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.filter((category) => category === envelope.category || !usedCategories.includes(category)).map((category) => (
                  <SelectItem key={category} value={category}>
                    {t(`envelopeCategory.${category}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {onRemove && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onRemove}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t("aircraftData.envelope.remove")}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("aircraftData.envelope.help")}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <EditableTable
          id={`envelope-${index}`}
          caption={t("aircraftData.envelope.pointsCaption")}
          reorderable
          rows={envelope.points}
          onChange={(points) => onChange({ ...envelope, points })}
          newRow={() => envelope.points[envelope.points.length - 1] ?? { armM: 0, massKg: 0 }}
          addLabel={t("aircraftData.envelope.addPoint")}
          emptyText={t("aircraftData.envelope.noPoints")}
          columns={[
            {
              key: "arm",
              label: t("aircraftData.envelope.arm"),
              unit: armUnit,
              digits: ARM_DIGITS[armUnit],
              read: (point) => roundTo(armFromM(point.armM, armUnit), ARM_DIGITS[armUnit]),
              write: (point, value) => ({ ...point, armM: armToM(Number(value ?? 0), armUnit) }),
            },
            {
              key: "mass",
              label: t("aircraftData.envelope.mass"),
              unit: massUnit,
              digits: 1,
              read: (point) => roundTo(massFromKg(point.massKg, massUnit), 1),
              write: (point, value) => ({ ...point, massKg: massToKg(Number(value ?? 0), massUnit) }),
            },
          ]}
        />
        <div className="space-y-2">
          <MassBalanceChart envelope={envelope.points} points={plotted} title={t("aircraftData.envelope.preview")} />
          {issues.length > 0 ? (
            <p className="text-sm text-destructive" role="status">
              {t(`aircraftData.envelope.issue.${issues[0]}`)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground" role="status">
              {t("aircraftData.envelope.valid")}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
