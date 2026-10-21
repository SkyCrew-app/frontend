"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { ErrorState } from "@/components/layout/ErrorState"
import { NumberField } from "@/components/navplan/NumberField"
import { toast } from "@/components/hooks/use-toast"
import { FLIGHT_PLANNING_SETTINGS, SAVE_FLIGHT_PLANNING_SETTINGS } from "@/graphql/aircraft-data"
import { apiRefusal } from "@/lib/api-refusal"
import { AMC_RESERVES, DEFAULT_SETTINGS, settingsProblems, type SettingsProblem } from "@/lib/navplan/aircraft-data"
import type { FlightPlanningSettings } from "@/lib/navplan/types"

type NumericKey = Exclude<keyof FlightPlanningSettings, "alternateRequiredVfr">

const clean = (settings: FlightPlanningSettings): FlightPlanningSettings => ({
  reserveVfrDayLocalMin: settings.reserveVfrDayLocalMin,
  reserveVfrDayMin: settings.reserveVfrDayMin,
  reserveVfrNightMin: settings.reserveVfrNightMin,
  contingencyPercent: settings.contingencyPercent,
  contingencyMinL: settings.contingencyMinL,
  alternateRequiredVfr: settings.alternateRequiredVfr,
  clubMarginMin: settings.clubMarginMin,
  verticalMarginFt: settings.verticalMarginFt,
  defaultCircuitHeightFt: settings.defaultCircuitHeightFt,
  msaCorridorNm: settings.msaCorridorNm,
  msaMarginFt: settings.msaMarginFt,
  takeoffSafetyFactor: settings.takeoffSafetyFactor,
  landingSafetyFactor: settings.landingSafetyFactor,
})

/** Fuel policy of the club for the flight preparation, never below the AMC to Part-NCO. */
export function FlightPlanningSettingsForm() {
  const { t } = useTranslation("navplan")
  const { data, loading, error, refetch } = useQuery<{ flightPlanningSettings: FlightPlanningSettings }>(FLIGHT_PLANNING_SETTINGS)
  const [save, { loading: saving }] = useMutation(SAVE_FLIGHT_PLANNING_SETTINGS, {
    refetchQueries: [{ query: FLIGHT_PLANNING_SETTINGS }],
  })
  const saved = data?.flightPlanningSettings ? clean(data.flightPlanningSettings) : null
  const [values, setValues] = useState<FlightPlanningSettings>(saved ?? DEFAULT_SETTINGS)
  const [showProblems, setShowProblems] = useState(false)

  useEffect(() => {
    if (data?.flightPlanningSettings) setValues(clean(data.flightPlanningSettings))
  }, [data])

  if (error) return <ErrorState onRetry={() => refetch()} />
  if (loading || !saved) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const problems = settingsProblems(values)
  const dirty = JSON.stringify(values) !== JSON.stringify(saved)
  const problemOf = (key: SettingsProblem) => showProblems && problems.includes(key)

  const numberField = (key: NumericKey, unit: string, digits: number, hint?: string) => {
    const id = `fps-${key}`
    const invalid = problemOf(key)
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{t(`settings.fields.${key}`, { unit })}</Label>
        <NumberField
          id={id}
          value={values[key]}
          unit={unit}
          digits={digits}
          invalid={invalid}
          aria-describedby={`${id}-hint`}
          onValueChange={(next) => setValues((current) => ({ ...current, [key]: next ?? Number.NaN }))}
        />
        <p id={`${id}-hint`} className={invalid ? "text-sm text-destructive" : "text-xs text-muted-foreground"}>
          {invalid ? t(`settings.problems.${key}`, { min: AMC_RESERVES[key as keyof typeof AMC_RESERVES] }) : hint}
        </p>
      </div>
    )
  }

  const submit = async () => {
    setShowProblems(true)
    if (problems.length > 0) {
      toast({ variant: "destructive", title: t("settings.toast.saveFailed"), description: t("settings.toast.invalid") })
      return
    }
    try {
      await save({ variables: { input: values } })
      setShowProblems(false)
      toast({ title: t("settings.toast.saved") })
    } catch (saveError) {
      toast({ variant: "destructive", title: t("settings.toast.saveFailed"), description: apiRefusal(saveError, t("settings.toast.tryAgain")) })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <h2>{t("settings.reserve.title")}</h2>
          </CardTitle>
          <CardDescription>{t("settings.reserve.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {numberField("reserveVfrDayLocalMin", "min", 0, t("settings.hints.reserveVfrDayLocalMin"))}
          {numberField("reserveVfrDayMin", "min", 0, t("settings.hints.reserveVfrDayMin"))}
          {numberField("reserveVfrNightMin", "min", 0, t("settings.hints.reserveVfrNightMin"))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <h2>{t("settings.club.title")}</h2>
          </CardTitle>
          <CardDescription>{t("settings.club.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {numberField("contingencyPercent", "%", 1, t("settings.hints.contingencyPercent"))}
          {numberField("contingencyMinL", "L", 1, t("settings.hints.contingencyMinL"))}
          {numberField("clubMarginMin", "min", 0, t("settings.hints.clubMarginMin"))}
          <div className="flex items-start gap-3 sm:col-span-3">
            <Switch
              id="fps-alternateRequiredVfr"
              checked={values.alternateRequiredVfr}
              onCheckedChange={(checked) => setValues((current) => ({ ...current, alternateRequiredVfr: checked }))}
              aria-describedby="fps-alternateRequiredVfr-hint"
            />
            <div className="space-y-0.5">
              <Label htmlFor="fps-alternateRequiredVfr">{t("settings.fields.alternateRequiredVfr")}</Label>
              <p id="fps-alternateRequiredVfr-hint" className="text-xs text-muted-foreground">
                {t("settings.hints.alternateRequiredVfr")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <h2>{t("settings.other.title")}</h2>
          </CardTitle>
          <CardDescription>{t("settings.other.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {numberField("verticalMarginFt", "ft", 0, t("settings.hints.verticalMarginFt"))}
          {numberField("defaultCircuitHeightFt", "ft", 0, t("settings.hints.defaultCircuitHeightFt"))}
          <p className="text-sm text-muted-foreground sm:col-span-3">{t("settings.taxiFuelNote")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <h2>{t("settings.terrain.title")}</h2>
          </CardTitle>
          <CardDescription>{t("settings.terrain.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {numberField("msaCorridorNm", "NM", 1, t("settings.hints.msaCorridorNm"))}
          {numberField("msaMarginFt", "ft", 0, t("settings.hints.msaMarginFt"))}
          {numberField("takeoffSafetyFactor", "×", 2, t("settings.hints.takeoffSafetyFactor"))}
          {numberField("landingSafetyFactor", "×", 2, t("settings.hints.landingSafetyFactor"))}
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          {dirty ? (
            <>
              <span className="h-2 w-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
              <span className="text-foreground">{t("settings.unsaved")}</span>
            </>
          ) : (
            t("settings.nothingToSave")
          )}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || saving}
            onClick={() => {
              setValues(saved)
              setShowProblems(false)
            }}
          >
            {t("settings.discard")}
          </Button>
          <Button type="button" disabled={!dirty || saving} onClick={() => void submit()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {t("common:actions.save")}
          </Button>
        </div>
      </div>
    </div>
  )
}
