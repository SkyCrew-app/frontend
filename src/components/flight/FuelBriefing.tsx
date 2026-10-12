"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDecimal } from "@/lib/format"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FuelPolicy {
  taxi_liters: number
  trip_liters: number
  contingency_liters: number
  alternate_liters: number
  final_reserve_liters: number
  total_liters: number
}

interface WindSummary {
  wind_dir_deg: number
  wind_speed_kts: number
  headwind_kts: number
  crosswind_kts: number
  wca_deg: number
  ground_speed_kts: number
}

interface FuelBriefingProps {
  fuelPolicy?: FuelPolicy | null
  windSummary?: WindSummary | null
  performanceProfile?: string | null
  flightType?: string
}

const hasFuelData = (fuelPolicy?: FuelPolicy | null): fuelPolicy is FuelPolicy =>
  !!fuelPolicy && fuelPolicy.total_liters > 0

const hasWindData = (windSummary?: WindSummary | null): windSummary is WindSummary =>
  !!windSummary && windSummary.wind_speed_kts > 0

/** Tells whether the briefing has anything to show, so the page can hide its section. */
export const hasFuelBriefing = (fuelPolicy?: FuelPolicy | null, windSummary?: WindSummary | null) =>
  hasFuelData(fuelPolicy) || hasWindData(windSummary)

/* ------------------------------------------------------------------ */
/*  Fuel bar helper                                                    */
/* ------------------------------------------------------------------ */

function FuelBar({ label, liters, total, barClass }: { label: string; liters: number; total: number; barClass: string }) {
  const pct = total > 0 ? Math.min((liters / total) * 100, 100) : 0

  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr_4.5rem] items-center gap-3 text-sm">
      <span className="truncate text-muted-foreground">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all duration-500", barClass)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-right font-medium tabular-nums">{formatDecimal(liters)} L</span>
    </div>
  )
}

function WindFact({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg bg-muted/50 p-3", highlight && "bg-warning/15")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 text-sm font-semibold tabular-nums", highlight && "text-warning")}>{value}</dd>
    </div>
  )
}

const signed = (value: number, digits = 0) => `${value > 0 ? "+" : ""}${formatDecimal(value, digits)}`

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FuelBriefing({ fuelPolicy, windSummary, performanceProfile, flightType }: FuelBriefingProps) {
  const fuel = hasFuelData(fuelPolicy) ? fuelPolicy : null
  const wind = hasWindData(windSummary) ? windSummary : null

  if (!fuel && !wind) return null

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {fuel && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Carburant</CardTitle>
            <CardDescription>
              Calcul selon les règles OACI, réserve finale de {flightType === "IFR" ? "30" : "45"} min
              {performanceProfile ? ` · profil ${performanceProfile}` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <FuelBar label="Roulage" liters={fuel.taxi_liters} total={fuel.total_liters} barClass="bg-muted-foreground" />
              <FuelBar label="Étape" liters={fuel.trip_liters} total={fuel.total_liters} barClass="bg-primary" />
              <FuelBar
                label="Réserve de route (5 %)"
                liters={fuel.contingency_liters}
                total={fuel.total_liters}
                barClass="bg-info"
              />
              <FuelBar label="Dégagement" liters={fuel.alternate_liters} total={fuel.total_liters} barClass="bg-warning" />
              <FuelBar
                label="Réserve finale"
                liters={fuel.final_reserve_liters}
                total={fuel.total_liters}
                barClass="bg-destructive"
              />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm font-medium">Total requis</span>
              <span className="text-lg font-semibold tabular-nums">{formatDecimal(fuel.total_liters)} L</span>
            </div>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              Vérifiez avant le départ que le carburant embarqué couvre au moins {formatDecimal(fuel.total_liters, 0)} L.
            </p>
          </CardContent>
        </Card>
      )}

      {wind && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vent en route</CardTitle>
            <CardDescription>Vent moyen retenu pour le calcul de la route.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <WindFact
                label="Vent"
                value={`${Math.round(wind.wind_dir_deg).toString().padStart(3, "0")}° / ${Math.round(wind.wind_speed_kts)} kt`}
              />
              <WindFact
                label={wind.headwind_kts >= 0 ? "Vent de face" : "Vent arrière"}
                value={`${Math.round(Math.abs(wind.headwind_kts))} kt`}
                highlight={wind.headwind_kts > 10}
              />
              <WindFact
                label="Vent de travers"
                value={`${Math.round(Math.abs(wind.crosswind_kts))} kt`}
                highlight={Math.abs(wind.crosswind_kts) > 12}
              />
              <WindFact label="Correction de dérive" value={`${signed(wind.wca_deg, 1)}°`} />
              <WindFact label="Vitesse sol" value={`${Math.round(wind.ground_speed_kts)} kt`} />
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
