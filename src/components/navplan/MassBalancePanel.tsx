"use client"

import { useTranslation } from "react-i18next"
import { CheckCircle2, OctagonAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/format"
import { checkStatusLabel, checkStatusVariant, massBalanceComputed } from "@/lib/navplan/status"
import type { MassBalanceResult, MassBalanceState } from "@/lib/navplan/types"
import { formatArm, formatKg, formatMm, formatMoment } from "@/lib/navplan/units"
import { cn } from "@/lib/utils"
import { MassBalanceChart, type PlottedPoint } from "./MassBalanceChart"

interface MassBalancePanelProps {
  massBalance: MassBalanceResult
  weighingDate?: string | null
}

export function massBalancePoints(result: MassBalanceResult, labels: { takeoff: [string, string]; landing: [string, string]; zeroFuel: [string, string] }): PlottedPoint[] {
  const point = (state: MassBalanceState, [label, name]: [string, string], shape: PlottedPoint["shape"]): PlottedPoint => ({
    armM: state.cgM,
    massKg: state.massKg,
    label,
    name,
    within: state.withinEnvelope,
    shape,
  })
  return [
    point(result.takeoff, labels.takeoff, "circle"),
    point(result.landing, labels.landing, "square"),
    point(result.zeroFuel, labels.zeroFuel, "diamond"),
  ]
}

/** Mass & balance of the flight: verdict first, then the chart and the loading table. */
export function MassBalancePanel({ massBalance, weighingDate }: MassBalancePanelProps) {
  const { t } = useTranslation("navplan")
  if (!massBalanceComputed(massBalance)) {
    return (
      <div className="space-y-2 rounded-lg border border-warning/50 bg-warning/10 p-4">
        <p className="font-semibold">{t("massBalance.notComputed")}</p>
        {massBalance.messages.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-4 text-sm">
            {massBalance.messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
      </div>
    )
  }
  const out = massBalance.status === "BLOCKING"
  const points = massBalancePoints(massBalance, {
    takeoff: [t("massBalance.short.takeoff"), t("massBalance.takeoff")],
    landing: [t("massBalance.short.landing"), t("massBalance.landing")],
    zeroFuel: [t("massBalance.short.zeroFuel"), t("massBalance.zeroFuel")],
  })

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border p-4",
          out ? "border-destructive/50 bg-destructive/10" : massBalance.status === "OK" ? "border-success/40 bg-success/10" : "border-warning/50 bg-warning/10",
        )}
      >
        {out ? (
          <OctagonAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        )}
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">{out ? t("massBalance.verdict.out") : t("massBalance.verdict.ok")}</p>
          {massBalance.messages.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-4 text-sm">
              {massBalance.messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
        <Badge variant={checkStatusVariant(massBalance.status)} className="ml-auto shrink-0">
          {checkStatusLabel(massBalance.status)}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <MassBalanceChart envelope={massBalance.envelope.points} points={points} showPath />
          <p className="text-xs text-muted-foreground">
            {t("massBalance.chart.legend", { category: t(`envelopeCategory.${massBalance.envelope.category}`) })}
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <StateCard title={t("massBalance.takeoff")} state={massBalance.takeoff} />
          <StateCard title={t("massBalance.landing")} state={massBalance.landing} />
          <StateCard title={t("massBalance.zeroFuel")} state={massBalance.zeroFuel} />
        </dl>
      </div>

      <div
        className="relative overflow-x-auto rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        tabIndex={0}
        role="region"
        aria-label={t("massBalance.table.caption")}
      >
        <table className="w-full text-sm [&_td]:px-2.5 [&_td]:py-2 [&_th]:px-2.5 [&_th]:py-2">
          <caption className="sr-only">{t("massBalance.table.caption")}</caption>
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr className="border-b">
              <th scope="col" className="text-left font-medium">{t("massBalance.table.station")}</th>
              <th scope="col" className="text-right font-medium">{t("massBalance.table.mass")}</th>
              <th scope="col" className="text-right font-medium">{t("massBalance.table.arm")}</th>
              <th scope="col" className="text-right font-medium">{t("massBalance.table.moment")}</th>
            </tr>
          </thead>
          <tbody>
            {massBalance.lines.map((line) => (
              <tr key={line.stationId} className="border-b">
                <td>{line.label}</td>
                <td className="whitespace-nowrap text-right tabular-nums">{formatKg(line.massKg)}</td>
                <td className="whitespace-nowrap text-right tabular-nums">{formatArm(line.armM)}</td>
                <td className="whitespace-nowrap text-right tabular-nums">{formatMoment(line.momentKgm)}</td>
              </tr>
            ))}
            <tr className="font-medium">
              <td>{t("massBalance.takeoff")}</td>
              <td className="whitespace-nowrap text-right tabular-nums">{formatKg(massBalance.takeoff.massKg)}</td>
              <td className="whitespace-nowrap text-right tabular-nums">{formatArm(massBalance.takeoff.cgM)}</td>
              <td className="whitespace-nowrap text-right tabular-nums">{formatMoment(massBalance.takeoff.momentKgm)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("massBalance.disclaimer", { date: weighingDate ? formatDate(weighingDate) : "—" })}
      </p>
    </div>
  )
}

function StateCard({ title, state }: { title: string; state: MassBalanceState }) {
  const { t } = useTranslation("navplan")
  return (
    <div className="rounded-lg border p-3">
      <dt className="flex items-center justify-between gap-2 text-sm font-medium">
        {title}
        <Badge variant={state.withinEnvelope ? "success" : "danger"}>
          {state.withinEnvelope ? t("massBalance.within") : t("massBalance.outside")}
        </Badge>
      </dt>
      <dd className="mt-2 space-y-0.5 text-sm tabular-nums">
        <span className="block">{t("massBalance.massValue", { value: formatKg(state.massKg) })}</span>
        <span className="block">{t("massBalance.cgValue", { value: formatArm(state.cgM) })}</span>
        <span className="block text-xs text-muted-foreground">
          {t("massBalance.margins", { kg: formatKg(state.marginKg, 0), mm: formatMm(state.marginCgMm) })}
        </span>
      </dd>
    </div>
  )
}
