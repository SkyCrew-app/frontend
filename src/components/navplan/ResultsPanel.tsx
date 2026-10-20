"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { checkStatusLabel, checkStatusVariant, massBalanceComputed } from "@/lib/navplan/status"
import type { CheckStatus, FlightPlanningSettings, FlightPlanResult, ReserveCase } from "@/lib/navplan/types"
import { formatLitres, formatMinutes, formatNm } from "@/lib/navplan/units"
import { cn } from "@/lib/utils"
import { AirspaceCrossings, airspacesNotChecked, crossingsStatus } from "./AirspaceCrossings"
import { FlightConditions } from "./FlightConditions"
import { FuelSummary } from "./FuelSummary"
import { MassBalancePanel } from "./MassBalancePanel"
import { NavLogTable } from "./NavLogTable"
import { NavdataAge, NoticesList } from "./NoticesBanner"
import { WeatherPanel } from "./WeatherPanel"
import { AerodromesPanel, aerodromeSheetId } from "./AerodromeSheet"
import { RunwayDistancesSummary } from "./RunwayDistances"
import { TerrainProfileChart } from "./TerrainProfileChart"

export type ResultsTab = "log" | "aerodromes" | "massBalance" | "fuel" | "airspaces" | "weather"

interface ResultsPanelProps {
  result: FlightPlanResult
  reserveCase: ReserveCase
  settings?: FlightPlanningSettings | null
  weighingDate?: string | null
  roles: Record<string, "departure" | "destination" | "alternate">
  /** The result is being recomputed after a change. */
  pending?: boolean
  tab?: ResultsTab
  onTabChange?: (tab: ResultsTab) => void
  /** The key figures are shown elsewhere (next to the map in the builder). */
  hideSummary?: boolean
  /** Off-block time of the plan (ISO), the reference day of the times shown. */
  departureTime?: string
}

const STATUS_DOT: Record<CheckStatus, string> = {
  OK: "bg-success",
  WARNING: "bg-warning",
  BLOCKING: "bg-destructive",
}

function TabStatus({ status }: { status: CheckStatus }) {
  return (
    <>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[status])} aria-hidden="true" />
      <span className="sr-only">({checkStatusLabel(status)})</span>
    </>
  )
}

/** Live results of the plan: key figures and verdicts on top, details in tabs. */
export function ResultsPanel({
  result,
  reserveCase,
  settings,
  weighingDate,
  roles,
  pending = false,
  tab,
  onTabChange,
  hideSummary = false,
  departureTime,
}: ResultsPanelProps) {
  const { t } = useTranslation("navplan")
  // Uncontrolled when the page does not follow the tab (a saved plan).
  const [ownTab, setOwnTab] = useState<ResultsTab>("log")
  const shownTab = tab ?? ownTab
  const changeTab = (value: ResultsTab) => {
    setOwnTab(value)
    onTabChange?.(value)
  }
  const notChecked = airspacesNotChecked(result.notices)
  const zones = crossingsStatus(result.alternateLeg ? [...result.legs, result.alternateLeg] : result.legs, notChecked, result.unverifiedAirspaces)

  return (
    <div className="space-y-4" aria-busy={pending}>
      {!hideSummary && <ResultsSummary result={result} pending={pending} />}

      <NoticesList notices={result.notices} />

      <FlightConditions result={result} departureTime={departureTime} />

      <Tabs value={shownTab} onValueChange={(value) => changeTab(value as ResultsTab)}>
        <TabsList className="tabs-list h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="log">{t("results.tabs.log")}</TabsTrigger>
          <TabsTrigger value="aerodromes">{t("results.tabs.aerodromes")}</TabsTrigger>
          <TabsTrigger value="massBalance" className="gap-1.5">
            {t("results.tabs.massBalance")}
            <TabStatus status={result.massBalance.status} />
          </TabsTrigger>
          <TabsTrigger value="fuel" className="gap-1.5">
            {t("results.tabs.fuel")}
            <TabStatus status={result.fuel.status} />
          </TabsTrigger>
          <TabsTrigger value="airspaces" className="gap-1.5">
            {t("results.tabs.airspaces")}
            <TabStatus status={zones} />
          </TabsTrigger>
          <TabsTrigger value="weather">{t("results.tabs.weather")}</TabsTrigger>
        </TabsList>
        <TabsContent value="log" className="mt-4 space-y-6">
          <NavLogTable
            legs={result.legs}
            alternateLeg={result.alternateLeg}
            totalDistanceNm={result.totalDistanceNm}
            totalTimeMin={result.totalTimeMin}
            aerodromes={result.aerodromes}
            onOpenAerodrome={(icao) => {
              changeTab("aerodromes")
              setTimeout(() => document.getElementById(aerodromeSheetId(icao))?.scrollIntoView({ behavior: "smooth", block: "start" }), 120)
            }}
          />
          <section className="space-y-2" aria-labelledby="results-profile">
            <h3 id="results-profile" className="text-sm font-semibold">
              {t("profile.title")}
            </h3>
            <TerrainProfileChart result={result} />
          </section>
          {(result.aerodromes ?? []).some((aerodrome) => aerodrome.distances) && (
            <section className="space-y-2" aria-labelledby="results-distances">
              <h3 id="results-distances" className="text-sm font-semibold">
                {t("distances.title")}
              </h3>
              <RunwayDistancesSummary aerodromes={result.aerodromes} />
            </section>
          )}
        </TabsContent>
        <TabsContent value="aerodromes" className="mt-4">
          <AerodromesPanel result={result} />
        </TabsContent>
        <TabsContent value="massBalance" className="mt-4">
          <MassBalancePanel massBalance={result.massBalance} weighingDate={weighingDate} />
        </TabsContent>
        <TabsContent value="fuel" className="mt-4">
          {/* The API applies the night reserve to a flight partly at night, whatever was chosen. */}
          <FuelSummary fuel={result.fuel} reserveCase={result.fuel.reserveCase ?? reserveCase} settings={settings} />
        </TabsContent>
        <TabsContent value="airspaces" className="mt-4">
          <AirspaceCrossings legs={result.legs} alternateLeg={result.alternateLeg} notChecked={notChecked} unverified={result.unverifiedAirspaces} />
        </TabsContent>
        <TabsContent value="weather" className="mt-4">
          <WeatherPanel
            reports={result.weather}
            roles={roles}
            windSource={result.windSource}
            aerodromes={result.aerodromes}
            freezingLevels={result.freezingLevels}
            legs={result.alternateLeg ? [...result.legs, result.alternateLeg] : result.legs}
          />
        </TabsContent>
      </Tabs>

      <NavdataAge navdata={result.navdata} />
    </div>
  )
}

function KeyFigure({ label, value, status }: { label: string; value: string; status?: CheckStatus }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {status && <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])} aria-hidden="true" />}
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          status === "BLOCKING" && "text-destructive",
        )}
      >
        {value}
        {status && <span className="sr-only"> ({checkStatusLabel(status)})</span>}
      </dd>
    </div>
  )
}

/** Overall verdict and key figures of the plan. */
export function ResultsSummary({ result, pending = false }: { result: FlightPlanResult; pending?: boolean }) {
  const { t } = useTranslation("navplan")
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={checkStatusVariant(result.status)}>{t("results.overall", { status: checkStatusLabel(result.status) })}</Badge>
        {pending && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {t("results.updating")}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KeyFigure label={t("results.distance")} value={formatNm(result.totalDistanceNm)} />
        <KeyFigure label={t("results.time")} value={formatMinutes(result.totalTimeMin)} />
        <KeyFigure label={t("results.minimumBlock")} value={formatLitres(result.fuel.minimumBlockL)} status={result.fuel.status} />
        <KeyFigure
          label={t("results.massBalance")}
          value={
            !massBalanceComputed(result.massBalance)
              ? t("massBalance.notComputedShort")
              : result.massBalance.status === "BLOCKING"
                ? t("massBalance.outside")
                : t("massBalance.within")
          }
          status={result.massBalance.status}
        />
      </dl>
    </div>
  )
}
