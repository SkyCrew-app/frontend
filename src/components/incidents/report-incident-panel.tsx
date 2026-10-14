"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { SidePanel } from "@/components/layout/SidePanel"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/hooks/use-toast"
import { CREATE_INCIDENT } from "@/graphql/incident"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import { groundsAircraft } from "@/lib/flight-closing"
import { apiRefusal } from "@/lib/api-refusal"
import { INCIDENT_STATUS_VALUES } from "@/lib/incident"

// Codes the API expects; their labels are those of the flight closing form.
const SEVERITIES = ["low", "medium", "high"] as const
const CATEGORIES = ["mechanical", "electrical", "weather", "human_error", "other"] as const

interface AircraftOption {
  id: number | string
  registration_number: string
  model?: string | null
}

interface ReportIncidentPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The aircraft the panel was opened from: it is then fixed. */
  aircraft?: AircraftOption | null
  /** Called once the incident is recorded. */
  onReported?: () => void
}

type Errors = Partial<Record<"aircraft" | "severity" | "description" | "date", string>>

const Required = () => (
  <span className="text-destructive" aria-hidden="true">
    {" *"}
  </span>
)

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null

/**
 * Report an incident on an aircraft outside a flight closing: something seen on the ground,
 * during a pre-flight check, or after a flight already closed. The API records the reporter.
 */
export function ReportIncidentPanel({ open, onOpenChange, aircraft = null, onReported }: ReportIncidentPanelProps) {
  const { t } = useTranslation("fleet")
  const { toast } = useToast()
  const { data: fleet } = useQuery<{ getAircrafts: AircraftOption[] }>(GET_AIRCRAFTS, { skip: !open || !!aircraft })
  const [createIncident, { loading: saving }] = useMutation(CREATE_INCIDENT, {
    // The lists on screen follow: incidents, and the fleet (a severe incident grounds the aircraft).
    refetchQueries: ["GetIncidentsForMembers", "GetAllIncidents", "GetAircrafts"],
  })

  const [aircraftId, setAircraftId] = useState("")
  const [when, setWhen] = useState("")
  const [severity, setSeverity] = useState("")
  const [category, setCategory] = useState<string>("other")
  const [description, setDescription] = useState("")
  const [errors, setErrors] = useState<Errors>({})

  // A clean form each time the panel opens, on the aircraft it was opened from.
  useEffect(() => {
    if (!open) return
    setAircraftId(aircraft ? String(aircraft.id) : "")
    setWhen(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
    setSeverity("")
    setCategory("other")
    setDescription("")
    setErrors({})
  }, [open, aircraft])

  const aircrafts = aircraft ? [aircraft] : (fleet?.getAircrafts ?? [])
  const chosen = aircrafts.find((item) => String(item.id) === aircraftId)

  const handleSubmit = async () => {
    const next: Errors = {}
    if (!aircraftId) next.aircraft = t("incidents.report.errors.aircraft")
    if (!severity) next.severity = t("incidents.report.errors.severity")
    if (!description.trim()) next.description = t("incidents.report.errors.description")
    const date = when ? new Date(when) : null
    if (!date || Number.isNaN(date.getTime())) next.date = t("incidents.report.errors.date")
    else if (date > new Date()) next.date = t("incidents.report.errors.future")
    setErrors(next)
    if (Object.keys(next).length > 0 || !date) return

    try {
      await createIncident({
        variables: {
          incident: {
            aircraft_id: Number(aircraftId),
            incident_date: date.toISOString(),
            severity_level: severity,
            // Without a flight there is no separate triage: the priority follows the severity.
            priority: severity,
            category,
            description: description.trim(),
            status: INCIDENT_STATUS_VALUES.open,
          },
        },
      })
      toast({
        title: t("incidents.report.toast.done.title"),
        description: groundsAircraft(severity)
          ? t("incidents.report.toast.done.grounded", { registration: chosen?.registration_number ?? "" })
          : t("incidents.report.toast.done.description"),
      })
      onOpenChange(false)
      onReported?.()
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("incidents.report.toast.failed.title"),
        description: apiRefusal(error, t("incidents.report.toast.failed.description")),
      })
    }
  }

  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => (next || !saving) && onOpenChange(next)}
      title={t("incidents.report.title")}
      description={t("incidents.report.description")}
      onSubmit={handleSubmit}
      submitLabel={t("incidents.report.submit")}
      submitting={saving}
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="incident_aircraft">
              {t("common:labels.aircraft")}
              <Required />
            </Label>
            <Select
              value={aircraftId}
              onValueChange={(value) => {
                setAircraftId(value)
                setErrors((current) => ({ ...current, aircraft: undefined }))
              }}
              disabled={!!aircraft}
            >
              <SelectTrigger
                id="incident_aircraft"
                aria-invalid={errors.aircraft ? true : undefined}
                aria-describedby={errors.aircraft ? "incident_aircraft_error" : undefined}
              >
                <SelectValue placeholder={t("incidents.report.aircraftPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {aircrafts.map((item) => (
                  <SelectItem key={String(item.id)} value={String(item.id)}>
                    {item.registration_number}
                    {item.model ? ` — ${item.model}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="incident_aircraft_error" message={errors.aircraft} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="incident_when">
              {t("incidents.report.when")}
              <Required />
            </Label>
            <Input
              id="incident_when"
              type="datetime-local"
              value={when}
              max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              onChange={(event) => {
                setWhen(event.target.value)
                setErrors((current) => ({ ...current, date: undefined }))
              }}
              aria-invalid={errors.date ? true : undefined}
              aria-describedby={errors.date ? "incident_when_error" : undefined}
            />
            <FieldError id="incident_when_error" message={errors.date} />
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium leading-none">
            {t("flights:closeFlight.incident.severityLabel")}
            <Required />
          </legend>
          <RadioGroup
            value={severity}
            onValueChange={(value) => {
              setSeverity(value)
              setErrors((current) => ({ ...current, severity: undefined }))
            }}
            className="flex flex-wrap gap-x-6 gap-y-2"
            aria-describedby={errors.severity ? "incident_severity_error" : undefined}
          >
            {SEVERITIES.map((level) => (
              <div key={level} className="flex items-center gap-2">
                <RadioGroupItem value={level} id={`incident_severity_${level}`} />
                <Label htmlFor={`incident_severity_${level}`} className="font-normal">
                  {t(`flights:closeFlight.incident.severity.${level}`)}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <p className={groundsAircraft(severity) ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {t("incidents.report.groundingHint")}
          </p>
          <FieldError id="incident_severity_error" message={errors.severity} />
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="incident_category">{t("common:labels.category")}</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="incident_category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {t(`flights:closeFlight.incident.category.${code}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="incident_description">
            {t("common:labels.description")}
            <Required />
          </Label>
          <Textarea
            id="incident_description"
            rows={4}
            className="resize-none"
            value={description}
            placeholder={t("incidents.report.descriptionPlaceholder")}
            onChange={(event) => {
              setDescription(event.target.value)
              setErrors((current) => ({ ...current, description: undefined }))
            }}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? "incident_description_error" : undefined}
          />
          <FieldError id="incident_description_error" message={errors.description} />
        </div>
      </div>
    </SidePanel>
  )
}
