"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Fuel, Wind, Gauge, AlertTriangle } from "lucide-react"

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
  estimatedFuelLiters?: number | null
  flightType?: string
}

/* ------------------------------------------------------------------ */
/*  Fuel bar helper                                                    */
/* ------------------------------------------------------------------ */

function FuelBar({ label, liters, total, color }: { label: string; liters: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((liters / total) * 100, 100) : 0

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 text-muted-foreground font-mono text-xs">{label}</span>
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-16 text-right font-mono text-xs font-semibold">{liters.toFixed(1)} L</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FuelBriefing({ fuelPolicy, windSummary, performanceProfile, estimatedFuelLiters, flightType }: FuelBriefingProps) {
  const hasFuel = fuelPolicy && fuelPolicy.total_liters > 0
  const hasWind = windSummary && windSummary.wind_speed_kts > 0

  if (!hasFuel && !hasWind && !performanceProfile) return null

  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-primary" />
            <span>OFP - Briefing Carburant & Vent</span>
          </div>
          {performanceProfile && (
            <Badge variant="secondary" className="font-mono text-xs">
              {performanceProfile}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ---- Fuel Policy ---- */}
        {hasFuel && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              Politique carburant OACI
              <Badge variant="outline" className="text-xs ml-auto">
                {flightType === 'IFR' ? 'IFR – Rés. 30min' : 'VFR – Rés. 45min'}
              </Badge>
            </h4>

            <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
              <FuelBar label="Taxi" liters={fuelPolicy!.taxi_liters} total={fuelPolicy!.total_liters} color="#64748B" />
              <FuelBar label="Trip" liters={fuelPolicy!.trip_liters} total={fuelPolicy!.total_liters} color="#3B82F6" />
              <FuelBar label="Contingency 5%" liters={fuelPolicy!.contingency_liters} total={fuelPolicy!.total_liters} color="#8B5CF6" />
              <FuelBar label="Alternate" liters={fuelPolicy!.alternate_liters} total={fuelPolicy!.total_liters} color="#F59E0B" />
              <FuelBar label="Réserve finale" liters={fuelPolicy!.final_reserve_liters} total={fuelPolicy!.total_liters} color="#EF4444" />

              <div className="border-t border-border pt-2 mt-2 flex justify-between items-center">
                <span className="font-mono text-sm font-bold">TOTAL REQUIS</span>
                <span className="font-mono text-lg font-bold text-primary">
                  {fuelPolicy!.total_liters.toFixed(1)} L
                </span>
              </div>
            </div>

            {estimatedFuelLiters && estimatedFuelLiters > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>
                  Vérifiez que le carburant embarqué couvre au minimum{" "}
                  <strong className="text-foreground">{fuelPolicy!.total_liters.toFixed(0)} L</strong>
                </span>
              </div>
            )}
          </div>
        )}

        {/* ---- Wind Summary ---- */}
        {hasWind && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Wind className="h-4 w-4 text-muted-foreground" />
              Résumé vent en route
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <WindInfoCard
                label="Vent"
                value={`${Math.round(windSummary!.wind_dir_deg).toString().padStart(3, '0')}° / ${Math.round(windSummary!.wind_speed_kts)}kt`}
                icon="🌬️"
              />
              <WindInfoCard
                label="Composante face"
                value={`${windSummary!.headwind_kts > 0 ? '+' : ''}${Math.round(windSummary!.headwind_kts)}kt`}
                icon={windSummary!.headwind_kts > 0 ? "🔴" : "🟢"}
                highlight={windSummary!.headwind_kts > 10}
              />
              <WindInfoCard
                label="Composante travers"
                value={`${Math.round(Math.abs(windSummary!.crosswind_kts))}kt`}
                icon="↔️"
                highlight={Math.abs(windSummary!.crosswind_kts) > 12}
              />
              <WindInfoCard
                label="WCA"
                value={`${windSummary!.wca_deg > 0 ? '+' : ''}${windSummary!.wca_deg.toFixed(1)}°`}
                icon="🧭"
              />
              <WindInfoCard
                label="Ground Speed"
                value={`${Math.round(windSummary!.ground_speed_kts)}kt`}
                icon="⚡"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Wind info card                                                     */
/* ------------------------------------------------------------------ */

function WindInfoCard({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string
  value: string
  icon: string
  highlight?: boolean
}) {
  return (
    <div
      className={`bg-muted/50 rounded-lg p-3 text-center ${
        highlight ? "ring-1 ring-amber-500/50" : ""
      }`}
    >
      <div className="text-lg mb-1">{icon}</div>
      <div className="font-mono text-sm font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  )
}
