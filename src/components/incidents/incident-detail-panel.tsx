"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { useMutation } from "@apollo/client"
import { CheckCircle, ExternalLink, Loader2, RotateCcw, Wrench } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SidePanel } from "@/components/layout/SidePanel"
import { useToast } from "@/components/hooks/use-toast"
import { flightTypeLabel } from "@/components/flight/flight-type"
import { GET_ALL_INCIDENTS, UPDATE_INCIDENT_STATUS } from "@/graphql/incident"
import { formatDate, formatDateTime, formatFlightDuration } from "@/lib/format"
import {
  INCIDENT_STATUS_VALUES,
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
}

type Action = "take" | "resolve" | "reopen" | "note"

const SUCCESS: Record<Action, { title: string; description: string }> = {
  take: { title: "Incident pris en charge", description: "Son statut est maintenant « En cours »." },
  resolve: { title: "Incident résolu", description: "L'incident est clôturé." },
  reopen: { title: "Incident rouvert", description: "Son statut est de nouveau « Ouvert »." },
  note: { title: "Note enregistrée", description: "La note de résolution a été mise à jour." },
}

const FAILURE: Record<Action, string> = {
  take: "L'incident n'a pas pu être pris en charge. Réessayez.",
  resolve: "L'incident n'a pas pu être marqué comme résolu. Réessayez.",
  reopen: "L'incident n'a pas pu être rouvert. Réessayez.",
  note: "La note de résolution n'a pas pu être enregistrée. Réessayez.",
}

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

export function IncidentDetailPanel({ incident, onClose, canFollowUp }: IncidentDetailPanelProps) {
  const { toast } = useToast()
  const [updateIncidentStatus] = useMutation(UPDATE_INCIDENT_STATUS)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState<Action | null>(null)
  const [confirm, setConfirm] = useState<"resolve" | "reopen" | null>(null)

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
  const naming = `du ${formatDate(incident.incident_date)} sur ${registration}`

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
      toast({ title: SUCCESS[action].title, description: SUCCESS[action].description })
      setConfirm(null)
    } catch {
      toast({ variant: "destructive", title: "Action impossible", description: FAILURE[action] })
    } finally {
      setSaving(null)
    }
  }

  const spinner = (action: Action) =>
    saving === action ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null

  const footer = canFollowUp ? (
    <>
      <Button variant="outline" onClick={onClose} disabled={busy}>
        Fermer
      </Button>
      {isResolved ? (
        <Button variant="outline" onClick={() => setConfirm("reopen")} disabled={busy}>
          {spinner("reopen") ?? <RotateCcw className="h-4 w-4" aria-hidden="true" />}
          Rouvrir
        </Button>
      ) : (
        <>
          {status.key !== "in_progress" && (
            <Button variant="outline" onClick={() => run("take", "in_progress")} disabled={busy}>
              {spinner("take") ?? <Wrench className="h-4 w-4" aria-hidden="true" />}
              Prendre en charge
            </Button>
          )}
          <Button onClick={() => setConfirm("resolve")} disabled={busy}>
            {spinner("resolve") ?? <CheckCircle className="h-4 w-4" aria-hidden="true" />}
            Marquer comme résolu
          </Button>
        </>
      )}
    </>
  ) : undefined

  return (
    <>
      <SidePanel
        open
        onOpenChange={(next) => !next && !busy && !confirm && onClose()}
        title={`Incident ${naming}`}
        description={incident.aircraft.model || undefined}
        footer={footer}
      >
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Fact label="Date et heure">{formatDateTime(incident.incident_date)}</Fact>
            <Fact label="Catégorie">{incidentCategoryLabel(incident.category)}</Fact>
            <Fact label="Statut">
              <Badge variant={status.variant}>{status.label}</Badge>
            </Fact>
            <Fact label="Gravité">
              <Badge variant={severity.variant}>{severity.label}</Badge>
            </Fact>
            <Fact label="Priorité">{incidentPriorityLabel(incident.priority)}</Fact>
            <Fact label="Aéronef">
              {registration}
              {incident.aircraft.model && (
                <span className="block text-xs font-normal text-muted-foreground">{incident.aircraft.model}</span>
              )}
            </Fact>
          </dl>

          <TextSection title="Description" text={incident.description} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextSection title="Dommages constatés" text={incident.damage_report} />
            <TextSection title="Actions correctives du pilote" text={incident.corrective_actions} />
          </div>

          <section className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-semibold">Pilote et vol</h3>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Fact label="Déclaré par">
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
                  <Fact label="Vol">
                    {flight.origin_icao || "—"} → {flight.destination_icao || "—"}
                    <span className="block text-xs font-normal text-muted-foreground">{formatDate(flightDate)}</span>
                  </Fact>
                  <Fact label="Temps de vol">
                    <span className="tabular-nums">{formatFlightDuration(flight.flight_hours)}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {flightTypeLabel(flight.flight_type)}
                    </span>
                  </Fact>
                </>
              ) : (
                <Fact label="Vol">
                  <span className="font-normal text-muted-foreground">Aucun vol associé</span>
                </Fact>
              )}
            </dl>
            {flight && (
              <Link
                href={`/reservations/flight-plans/${flight.id}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Voir le plan de vol
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </section>

          <section className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold">Suivi</h3>
            {isResolved && (
              <dl className="grid grid-cols-2 gap-4">
                <Fact label="Résolu le">{formatDateTime(incident.resolved_at)}</Fact>
                <Fact label="Résolu par">{incidentPersonName(incident.resolved_by)}</Fact>
              </dl>
            )}
            {canFollowUp ? (
              <div className="space-y-2">
                <Label htmlFor="incident-resolution-note">Note de résolution</Label>
                <Textarea
                  id="incident-resolution-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Ex. : pneu remplacé le 14 octobre, essai au sol concluant."
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
                    Enregistrer la note
                  </Button>
                </div>
              </div>
            ) : (
              <TextSection title="Note de résolution" text={incident.resolution_note} />
            )}
          </section>
        </div>
      </SidePanel>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && !busy && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "reopen" ? "Rouvrir cet incident ?" : "Marquer cet incident comme résolu ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "reopen"
                ? `L'incident ${naming} repassera au statut « Ouvert ». La note de résolution est conservée.`
                : `L'incident ${naming} sera clôturé. Il pourra être rouvert si nécessaire.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm === "resolve" && (
            <div className="space-y-2">
              <Label htmlFor="incident-resolution-note-confirm">Note de résolution</Label>
              <Textarea
                id="incident-resolution-note-confirm"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ce qui a été fait pour résoudre l'incident."
                rows={3}
                disabled={busy}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              // Stays open until the change is saved.
              onClick={(event) => {
                event.preventDefault()
                if (confirm) void run(confirm, confirm === "reopen" ? "open" : "resolved")
              }}
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {confirm === "reopen" ? "Rouvrir" : "Marquer comme résolu"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
