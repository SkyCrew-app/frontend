"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useMutation, useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { ArrowLeft, BadgeCheck, FileStack, Loader2, Plane } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { toast } from "@/components/hooks/use-toast"
import {
  AIRCRAFT_FLIGHT_DATA,
  AIRCRAFT_TYPE_TEMPLATES,
  APPLY_AIRCRAFT_TEMPLATE,
  SAVE_AIRCRAFT_MASS_BALANCE,
  SAVE_AIRCRAFT_PERFORMANCE,
  VALIDATE_AIRCRAFT_DATA,
} from "@/graphql/aircraft-data"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import { apiRefusal } from "@/lib/api-refusal"
import { formatDateTime } from "@/lib/format"
import {
  massBalanceForSave,
  massBalanceInput,
  massBalanceProblems,
  performanceForSave,
  performanceInput,
  performanceProblems,
} from "@/lib/navplan/aircraft-data"
import { aircraftDataState, missingAircraftData, type AircraftDataState } from "@/lib/navplan/status"
import type {
  AircraftMassBalance,
  AircraftMassBalanceInput,
  AircraftPerformance,
  AircraftPerformanceInput,
  AircraftTypeTemplate,
} from "@/lib/navplan/types"
import type { ArmUnit, MassUnit, VolumeUnit } from "@/lib/navplan/units"
import { AircraftMassBalanceEditor } from "./AircraftMassBalanceEditor"
import { AircraftPerformanceEditor } from "./AircraftPerformanceEditor"

const STATE_VARIANT: Record<AircraftDataState, "danger" | "warning" | "info" | "success"> = {
  MISSING: "danger",
  INCOMPLETE: "warning",
  NOT_VALIDATED: "info",
  VALIDATED: "success",
}

interface AircraftSummary {
  id: number
  registration_number: string
  model: string
  fuel_capacity?: number | null
  empty_weight?: number | null
  max_takeoff_weight?: number | null
}

type DataQuery = { aircraftPerformance: AircraftPerformance | null; aircraftMassBalance: AircraftMassBalance | null }

const BackButton = () => {
  const { t } = useTranslation("navplan")
  return (
    <Button variant="outline" asChild>
      <Link href="/administration/planes">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("aircraftData.back")}
      </Link>
    </Button>
  )
}

/** Administration › Flotte › an aircraft: its performance and mass & balance, then their confirmation. */
export function AircraftFlightData({ aircraftId }: { aircraftId: number }) {
  const { t } = useTranslation("navplan")
  const fleet = useQuery<{ getAircrafts: AircraftSummary[] }>(GET_AIRCRAFTS)
  const dataQuery = useQuery<DataQuery>(AIRCRAFT_FLIGHT_DATA, { variables: { aircraftId } })
  const { data: templatesData } = useQuery<{ aircraftTypeTemplates: AircraftTypeTemplate[] }>(AIRCRAFT_TYPE_TEMPLATES)
  const aircraft = fleet.data?.getAircrafts.find((candidate) => Number(candidate.id) === aircraftId)

  const header = (
    <PageHeader
      className="mb-0"
      title={aircraft ? t("aircraftData.title", { registration: aircraft.registration_number }) : t("aircraftData.titleDefault")}
      description={t("aircraftData.description")}
      actions={<BackButton />}
    />
  )

  if (fleet.error || dataQuery.error) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState
          onRetry={() => {
            void fleet.refetch()
            void dataQuery.refetch()
          }}
        />
      </div>
    )
  }

  if (fleet.loading || dataQuery.loading || !dataQuery.data) {
    return (
      <div className="space-y-6" aria-busy="true">
        {header}
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  if (!aircraft) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState icon={Plane} title={t("aircraftData.notFound.title")} description={t("aircraftData.notFound.description")} action={<BackButton />} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {header}
      <FlightDataEditors
        aircraft={aircraft}
        data={dataQuery.data}
        templates={templatesData?.aircraftTypeTemplates ?? []}
      />
    </div>
  )
}

function FlightDataEditors({
  aircraft,
  data,
  templates,
}: {
  aircraft: AircraftSummary
  data: DataQuery
  templates: AircraftTypeTemplate[]
}) {
  const { t } = useTranslation("navplan")
  const aircraftId = Number(aircraft.id)
  const [tab, setTab] = useState("massBalance")
  const [massUnit, setMassUnit] = useState<MassUnit>("kg")
  const [armUnit, setArmUnit] = useState<ArmUnit>("m")
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>("L")
  const [template, setTemplate] = useState<string>(data.aircraftPerformance?.templateCode ?? "")
  const [confirmTemplate, setConfirmTemplate] = useState(false)
  const [confirmValidation, setConfirmValidation] = useState(false)
  const [showProblems, setShowProblems] = useState(false)

  const savedMassBalance = useMemo(() => {
    const value = massBalanceInput(data.aircraftMassBalance)
    if (!data.aircraftMassBalance) {
      value.emptyMassKg = aircraft.empty_weight ?? 0
      value.mtowKg = aircraft.max_takeoff_weight ?? 0
      value.mlwKg = aircraft.max_takeoff_weight ?? 0
    }
    return value
  }, [data.aircraftMassBalance, aircraft])
  const savedPerformance = useMemo(
    () => performanceInput(data.aircraftPerformance, aircraft.fuel_capacity, t("aircraftData.fuel.defaultTank")),
    [data.aircraftPerformance, aircraft.fuel_capacity, t],
  )
  const [massBalance, setMassBalance] = useState<AircraftMassBalanceInput>(savedMassBalance)
  const [performance, setPerformance] = useState<AircraftPerformanceInput>(savedPerformance)

  // A save or a template brings new values from the API: they become the form.
  useEffect(() => setMassBalance(savedMassBalance), [savedMassBalance])
  useEffect(() => setPerformance(savedPerformance), [savedPerformance])

  const massBalanceDirty = JSON.stringify(massBalance) !== JSON.stringify(savedMassBalance)
  const performanceDirty = JSON.stringify(performance) !== JSON.stringify(savedPerformance)
  const dirty = massBalanceDirty || performanceDirty

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const mbProblems = massBalanceProblems(massBalance, performance.fuel.tanks.map((tank) => tank.id))
  const perfProblems = performanceProblems(performance)
  const state = aircraftDataState(data.aircraftPerformance, data.aircraftMassBalance)
  const missing = missingAircraftData(data.aircraftPerformance, data.aircraftMassBalance)

  const refetchQueries = [{ query: AIRCRAFT_FLIGHT_DATA, variables: { aircraftId } }]
  const [applyTemplate, applying] = useMutation(APPLY_AIRCRAFT_TEMPLATE, { refetchQueries, awaitRefetchQueries: true })
  const [saveMassBalance, savingMassBalance] = useMutation(SAVE_AIRCRAFT_MASS_BALANCE, { refetchQueries, awaitRefetchQueries: true })
  const [savePerformance, savingPerformance] = useMutation(SAVE_AIRCRAFT_PERFORMANCE, { refetchQueries, awaitRefetchQueries: true })
  const [validate, validating] = useMutation(VALIDATE_AIRCRAFT_DATA, { refetchQueries, awaitRefetchQueries: true })
  const saving = savingMassBalance.loading || savingPerformance.loading

  const failed = (title: string, error: unknown) =>
    toast({ variant: "destructive", title, description: apiRefusal(error, t("aircraftData.toast.tryAgain")) })

  const save = async () => {
    setShowProblems(true)
    if (massBalanceDirty && mbProblems.length > 0) {
      setTab("massBalance")
      toast({ variant: "destructive", title: t("aircraftData.toast.saveFailed"), description: t("aircraftData.toast.fixMassBalance") })
      return
    }
    if (performanceDirty && perfProblems.length > 0) {
      setTab("performance")
      toast({ variant: "destructive", title: t("aircraftData.toast.saveFailed"), description: t("aircraftData.toast.fixPerformance") })
      return
    }
    try {
      if (performanceDirty) await savePerformance({ variables: { aircraftId, input: performanceForSave(performance) } })
      if (massBalanceDirty) await saveMassBalance({ variables: { aircraftId, input: massBalanceForSave(massBalance) } })
      setShowProblems(false)
      toast({ title: t("aircraftData.toast.saved"), description: t("aircraftData.toast.savedDescription") })
    } catch (error) {
      failed(t("aircraftData.toast.saveFailed"), error)
    }
  }

  const runTemplate = async () => {
    try {
      await applyTemplate({ variables: { aircraftId, templateCode: template } })
      toast({ title: t("aircraftData.toast.templateApplied") })
    } catch (error) {
      failed(t("aircraftData.toast.templateFailed"), error)
    }
  }

  const runValidation = async () => {
    try {
      await validate({ variables: { aircraftId } })
      toast({ title: t("aircraftData.toast.validated", { registration: aircraft.registration_number }) })
    } catch (error) {
      failed(t("aircraftData.toast.validationFailed"), error)
    }
  }

  const validatedAt = data.aircraftMassBalance?.validatedAt ?? data.aircraftPerformance?.validatedAt
  const validatedBy = data.aircraftMassBalance?.validatedBy ?? data.aircraftPerformance?.validatedBy
  const canValidate = state === "NOT_VALIDATED" && !dirty

  return (
    <>
      <Card>
        <CardContent className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">{t("aircraftData.status.title")}</h2>
              <Badge variant={STATE_VARIANT[state]}>{t(`aircraftState.${state}.badge`)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {state === "VALIDATED"
                ? t("aircraftData.status.validated", { date: formatDateTime(validatedAt), by: validatedBy ?? "—" })
                : t(`aircraftState.${state}.admin`)}
            </p>
            {missing.length > 0 && (
              <p className="text-sm">{t("aircraftState.missingList", { list: missing.map((field) => t(`aircraftState.missing.${field}`)).join(", ") })}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {state !== "VALIDATED" && (
              <Button type="button" onClick={() => setConfirmValidation(true)} disabled={!canValidate || validating.loading}>
                {validating.loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BadgeCheck className="h-4 w-4" aria-hidden="true" />}
                {t("aircraftData.validate.action")}
              </Button>
              )}
              {dirty && state !== "VALIDATED" && <span className="text-xs text-muted-foreground">{t("aircraftData.validate.saveFirst")}</span>}
              {state === "INCOMPLETE" && <span className="text-xs text-muted-foreground">{t("aircraftData.validate.completeFirst")}</span>}
            </div>
          </div>
          <div className="space-y-2 rounded-lg border p-4">
            <Label htmlFor="template">{t("aircraftData.template.label")}</Label>
            <Select value={template || undefined} onValueChange={setTemplate}>
              <SelectTrigger id="template">
                <SelectValue placeholder={t("aircraftData.template.choose")} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("aircraftData.template.help")}</p>
            <Button type="button" variant="outline" disabled={!template || applying.loading} onClick={() => setConfirmTemplate(true)}>
              {applying.loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileStack className="h-4 w-4" aria-hidden="true" />}
              {t("aircraftData.template.apply")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <UnitToggle id="unit-mass" label={t("aircraftData.units.mass")} value={massUnit} options={["kg", "lb"]} onChange={(next) => setMassUnit(next as MassUnit)} />
        <UnitToggle id="unit-arm" label={t("aircraftData.units.arm")} value={armUnit} options={["m", "mm", "in"]} onChange={(next) => setArmUnit(next as ArmUnit)} />
        <UnitToggle id="unit-volume" label={t("aircraftData.units.volume")} value={volumeUnit} options={["L", "USG"]} onChange={(next) => setVolumeUnit(next as VolumeUnit)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="massBalance" className="gap-1.5">
            {t("aircraftData.tabs.massBalance")}
            {massBalanceDirty && <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />}
            {massBalanceDirty && <span className="sr-only">{t("aircraftData.unsavedTab")}</span>}
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5">
            {t("aircraftData.tabs.performance")}
            {performanceDirty && <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />}
            {performanceDirty && <span className="sr-only">{t("aircraftData.unsavedTab")}</span>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="massBalance" className="mt-6">
          <AircraftMassBalanceEditor
            value={massBalance}
            onChange={setMassBalance}
            tanks={performance.fuel.tanks}
            armUnit={armUnit}
            massUnit={massUnit}
            problems={mbProblems}
            showProblems={showProblems}
          />
        </TabsContent>
        <TabsContent value="performance" className="mt-6">
          <AircraftPerformanceEditor
            value={performance}
            onChange={setPerformance}
            armUnit={armUnit}
            volumeUnit={volumeUnit}
            problems={perfProblems}
            showProblems={showProblems}
          />
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          {dirty ? (
            <>
              <span className="h-2 w-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
              <span className="text-foreground">{t("aircraftData.unsaved")}</span>
            </>
          ) : (
            t("aircraftData.nothingToSave")
          )}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || saving}
            onClick={() => {
              setMassBalance(savedMassBalance)
              setPerformance(savedPerformance)
              setShowProblems(false)
            }}
          >
            {t("aircraftData.discard")}
          </Button>
          <Button type="button" disabled={!dirty || saving} onClick={() => void save()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {t("common:actions.save")}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmTemplate} onOpenChange={setConfirmTemplate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("aircraftData.template.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("aircraftData.template.confirmDescription", { registration: aircraft.registration_number })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void runTemplate()}>{t("aircraftData.template.apply")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmValidation} onOpenChange={setConfirmValidation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("aircraftData.validate.confirmTitle", { registration: aircraft.registration_number })}</AlertDialogTitle>
            <AlertDialogDescription>{t("aircraftData.validate.confirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void runValidation()}>{t("aircraftData.validate.action")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function UnitToggle({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span id={id} className="text-xs text-muted-foreground">
        {label}
      </span>
      <ToggleGroup type="single" size="sm" value={value} onValueChange={(next) => next && onChange(next)} aria-labelledby={id}>
        {options.map((option) => (
          <ToggleGroupItem key={option} value={option}>
            {option}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
