"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { useMutation } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { CheckCircle, ExternalLink, Loader2, PlaneTakeoff, RotateCcw, Trash2, Wrench } from "lucide-react"
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
import { Button, buttonVariants } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SidePanel } from "@/components/layout/SidePanel"
import { useToast } from "@/components/hooks/use-toast"
import { flightTypeLabel } from "@/components/flight/flight-type"
import { DELETE_INCIDENT, GET_ALL_INCIDENTS, UPDATE_INCIDENT_STATUS } from "@/graphql/incident"
import { GET_AIRCRAFTS, SET_AIRCRAFT_AVAILABILITY } from "@/graphql/planes"
import { aircraftAvailability } from "@/lib/aircraft"
import { apiRefusal } from "@/lib/api-refusal"
import { formatDate, formatDateTime, formatFlightDuration } from "@/lib/format"
import {
  INCIDENT_STATUS_VALUES,
  canWithdrawIncident,
  incidentCategoryLabel,
  incidentPersonName,
  incidentPriorityLabel,
  incidentSeverity,
  incidentStatus,
  type Incident,
  type IncidentStatusKey,
} from "@/lib/incident"

interface IncidentDetailPanelProps {
  incident: Incident | null
  onClose: () => void
  /** Administrators and technicians follow incidents up; everyone else only reads. */
  canFollowUp: boolean
  /** The signed-in member: the author of a report nobody has taken up may delete it. */
  viewerId?: number | string | null
}

type Action = "take" | "resolve" | "reopen" | "note"


function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  )
}

function TextSection({ title, text }: { title: string; text: string | null | undefined }) {
  return (
    <section className="space-y-1">
      <h3 className="text-sm font-semibold">{title}</h3>
      {text?.trim() ? (
        <p className="whitespace-pre-wrap text-sm">{text}</p>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </section>
  )
}

export function IncidentDetailPanel({ incident, onClose, canFollowUp, viewerId }: IncidentDetailPanelProps) {
  const { t } = useTranslation("administration")
  const { toast } = useToast()
  const [updateIncidentStatus] = useMutation(UPDATE_INCIDENT_STATUS)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState<Action | null>(null)
  const [confirm, setConfirm] = useState<"resolve" | "reopen" | null>(null)
  const [setAircraftAvailability, { loading: returning }] = useMutation(SET_AIRCRAFT_AVAILABILITY)
  const [confirmReturn, setConfirmReturn] = useState(false)
  const [deleteIncident, { loading: withdrawing }] = useMutation(DELETE_INCIDENT)
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)

  const storedNote = incident?.resolution_note ?? ""

  // The field follows the incident shown, and what the API stored after a save.
  useEffect(() => {
    setNote(storedNote)
  }, [incident?.id, storedNote])

  if (!incident) return null

  const severity = incidentSeverity(incident.severity_level)
  const status = incidentStatus(incident.status)
  const registration = incident.aircraft.registration_number
  const flight = incident.flight
  const flightDate = flight?.reservation?.start_time ?? flight?.departure_time
  const isResolved = status.key === "resolved"
  const noteChanged = note.trim() !== storedNote.trim()
  const busy = saving !== null
  const naming = { date: formatDate(incident.incident_date), registration }

  const run = async (action: Action, target: IncidentStatusKey) => {
    setSaving(action)
    try {
      await updateIncidentStatus({
        variables: {
          id: Number(incident.id),
          status: INCIDENT_STATUS_VALUES[target],
          // null leaves the stored note as it is.
          resolution_note: noteChanged ? note.trim() : null,
        },
        refetchQueries: [{ query: GET_ALL_INCIDENTS }],
        awaitRefetchQueries: true,
      })
      toast({
        title: t(`incidents.toast.${action}.title`),
        description: t(`incidents.toast.${action}.description`),
      })
      setConfirm(null)
    } catch {
      toast({
        variant: "destructive",
        title: t("incidents.toast.failed"),
        description: t(`incidents.toast.${action}.failure`),
      })
    } finally {
      setSaving(null)
    }
  }

  // A severe incident grounds the aircraft; putting it back is a separate decision of the staff.
  const availability = aircraftAvailability(incident.aircraft.availability_status)
  const isGrounded = incident.aircraft.availability_status === "UNAVAILABLE"

  const returnToService = async () => {
    try {
      await setAircraftAvailability({
        variables: { aircraftId: Number(incident.aircraft.id), availability_status: "AVAILABLE" },
        refetchQueries: [{ query: GET_ALL_INCIDENTS }, { query: GET_AIRCRAFTS }],
        awaitRefetchQueries: true,
      })
      toast({
        title: t("fleet:incidents.toast.returned.title"),
        description: t("fleet:incidents.toast.returned.description", { registration }),
      })
      setConfirmReturn(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("fleet:incidents.toast.returnFailed.title"),
        description: apiRefusal(error, t("fleet:incidents.toast.returnFailed.description")),
      })
    }
  }

  // Offered only when the API accepts it: to its author, while nobody has acted on it.
  const canWithdraw = canWithdrawIncident(incident, viewerId)

  const withdraw = async () => {
    try {
      await deleteIncident({
        variables: { id: String(incident.id) },
        refetchQueries: ["GetAllIncidents", "GetIncidentsForMembers"],
        awaitRefetchQueries: true,
      })
      toast({ title: t("incidents.toast.withdraw.title"), description: t("incidents.toast.withdraw.description") })
      setConfirmWithdraw(false)
      onClose()
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("incidents.toast.failed"),
        description: apiRefusal(error, t("incidents.toast.withdraw.failure")),
      })
    }
  }

  const spinner = (action: Action) =>
    saving === action ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null

  const footer = canFollowUp ? (
    <>
      <Button variant="outline" onClick={onClose} disabled={busy}>
        {t("common:actions.close")}
      </Button>
      {isResolved ? (
        <Button variant="outline" onClick={() => setConfirm("reopen")} disabled={busy}>
          {spinner("reopen") ?? <RotateCcw className="h-4 w-4" aria-hidden="true" />}
          {t("incidents.actions.reopen")}
        </Button>
      ) : (
        <>
          {status.key !== "in_progress" && (
            <Button variant="outline" onClick={() => run("take", "in_progress")} disabled={busy}>
              {spinner("take") ?? <Wrench className="h-4 w-4" aria-hidden="true" />}
              {t("incidents.actions.take")}
            </Button>
          )}
          <Button onClick={() => setConfirm("resolve")} disabled={busy}>
            {spinner("resolve") ?? <CheckCircle className="h-4 w-4" aria-hidden="true" />}
            {t("incidents.actions.resolve")}
          </Button>
        </>
      )}
    </>
  ) : undefined

  return (
    <>
      <SidePanel
        open
        onOpenChange={(next) => !next && !busy && !confirm && !confirmReturn && !confirmWithdraw && onClose()}
        title={t("incidents.detail.title", naming)}
        description={incident.aircraft.model || undefined}
        footer={footer}
      >
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Fact label={t("incidents.detail.dateTime")}>{formatDateTime(incident.incident_date)}</Fact>
            <Fact label={t("common:labels.category")}>{incidentCategoryLabel(incident.category)}</Fact>
            <Fact label={t("common:labels.status")}>
              <Badge variant={status.variant}>{status.label}</Badge>
            </Fact>
            <Fact label={t("incidents.fields.severity")}>
              <Badge variant={severity.variant}>{severity.label}</Badge>
            </Fact>
            <Fact label={t("incidents.fields.priority")}>{incidentPriorityLabel(incident.priority)}</Fact>
            <Fact label={t("incidents.fields.aircraft")}>
              {registration}
              {incident.aircraft.model && (
                <span className="block text-xs font-normal text-muted-foreground">{incident.aircraft.model}</span>
              )}
            </Fact>
          </dl>

          {incident.aircraft.availability_status && (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0 space-y-1">
                {/* Not a paragraph: the badge is a block, which a paragraph cannot hold. */}
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {t("fleet:incidents.aircraftState")}
                  <Badge variant={availability.variant}>{availability.label}</Badge>
                </div>
                {isGrounded && severity.level === "high" && (
                  <p className="text-xs text-muted-foreground">{t("fleet:incidents.groundedHint")}</p>
                )}
              </div>
              {canFollowUp && isGrounded && (
                <Button variant="outline" size="sm" onClick={() => setConfirmReturn(true)} disabled={busy || returning}>
                  <PlaneTakeoff className="h-4 w-4" aria-hidden="true" />
                  {t("fleet:incidents.returnToService")}
                </Button>
              )}
            </section>
          )}

          <TextSection title={t("common:labels.description")} text={incident.description} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextSection title={t("incidents.detail.damage")} text={incident.damage_report} />
            <TextSection title={t("incidents.detail.correctiveActions")} text={incident.corrective_actions} />
          </div>

          <section className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-semibold">{t("incidents.detail.pilotAndFlight")}</h3>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Fact label={t("incidents.detail.reportedBy")}>
                {incidentPersonName(incident.user)}
                {incident.user?.email && (
                  <a
                    href={`mailto:${incident.user.email}`}
                    className="block break-all text-xs font-normal text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {incident.user.email}
                  </a>
                )}
              </Fact>
              {flight ? (
                <>
                  <Fact label={t("incidents.detail.flight")}>
                    {flight.origin_icao || "—"} → {flight.destination_icao || "—"}
                    <span className="block text-xs font-normal text-muted-foreground">{formatDate(flightDate)}</span>
                  </Fact>
                  <Fact label={t("incidents.detail.flightTime")}>
                    <span className="tabular-nums">{formatFlightDuration(flight.flight_hours)}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {flightTypeLabel(flight.flight_type)}
                    </span>
                  </Fact>
                </>
              ) : (
                <Fact label={t("incidents.detail.flight")}>
                  <span className="font-normal text-muted-foreground">
                    {/* A flight the reader may not see is not the same as no flight. */}
                    {t(incident.hasFlight ? "incidents.detail.flightRestricted" : "incidents.detail.noFlight")}
                  </span>
                </Fact>
              )}
            </dl>
            {flight && (
              <Link
                href={`/reservations/flight-plans/${flight.id}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                {t("incidents.detail.viewFlightPlan")}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </section>

          <section className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold">{t("incidents.detail.followUp")}</h3>
            {isResolved && (
              <dl className="grid grid-cols-2 gap-4">
                <Fact label={t("incidents.detail.resolvedAt")}>{formatDateTime(incident.resolved_at)}</Fact>
                <Fact label={t("incidents.detail.resolvedBy")}>{incidentPersonName(incident.resolved_by)}</Fact>
              </dl>
            )}
            {canFollowUp ? (
              <div className="space-y-2">
                <Label htmlFor="incident-resolution-note">{t("incidents.detail.resolutionNote")}</Label>
                <Textarea
                  id="incident-resolution-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t("incidents.detail.notePlaceholder")}
                  rows={3}
                  disabled={busy}
                />
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => run("note", status.key ?? "open")}
                    disabled={busy || !noteChanged}
                  >
                    {spinner("note")}
                    {t("incidents.actions.saveNote")}
                  </Button>
                </div>
              </div>
            ) : (
              <TextSection title={t("incidents.detail.resolutionNote")} text={incident.resolution_note} />
            )}
          </section>

          {canWithdraw && (
            <section className="flex flex-col gap-3 rounded-lg border border-destructive/30 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">{t("incidents.detail.withdrawHint")}</p>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-destructive hover:text-destructive"
                onClick={() => setConfirmWithdraw(true)}
                disabled={busy || withdrawing}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t("incidents.actions.withdraw")}
              </Button>
            </section>
          )}
        </div>
      </SidePanel>

      <AlertDialog open={confirmWithdraw} onOpenChange={(open) => !open && !withdrawing && setConfirmWithdraw(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("incidents.confirm.withdrawTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("incidents.confirm.withdrawDescription", naming)}
              {isGrounded && ` ${t("incidents.confirm.withdrawGrounded")}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdrawing}>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              // Stays open until the report is deleted.
              onClick={(event) => {
                event.preventDefault()
                void withdraw()
              }}
              disabled={withdrawing}
            >
              {withdrawing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              {t("incidents.actions.withdraw")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && !busy && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "reopen" ? t("incidents.confirm.reopenTitle") : t("incidents.confirm.resolveTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "reopen"
                ? t("incidents.confirm.reopenDescription", naming)
                : t("incidents.confirm.resolveDescription", naming)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm === "resolve" && (
            <div className="space-y-2">
              <Label htmlFor="incident-resolution-note-confirm">{t("incidents.detail.resolutionNote")}</Label>
              <Textarea
                id="incident-resolution-note-confirm"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t("incidents.confirm.notePlaceholder")}
                rows={3}
                disabled={busy}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              // Stays open until the change is saved.
              onClick={(event) => {
                event.preventDefault()
                if (confirm) void run(confirm, confirm === "reopen" ? "open" : "resolved")
              }}
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {confirm === "reopen" ? t("incidents.actions.reopen") : t("incidents.actions.resolve")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReturn} onOpenChange={(open) => !open && !returning && setConfirmReturn(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("fleet:incidents.confirmReturn.title", { registration })}</AlertDialogTitle>
            <AlertDialogDescription>{t("fleet:incidents.confirmReturn.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={returning}>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              // Stays open until the change is saved.
              onClick={(event) => {
                event.preventDefault()
                void returnToService()
              }}
              disabled={returning}
            >
              {returning && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {t("fleet:incidents.returnToService")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
