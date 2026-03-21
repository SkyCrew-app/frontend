"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ChecklistSubmission, ChecklistSubmissionStatus } from "@/interfaces/checklist"

interface ChecklistHistoryProps {
  submissions: ChecklistSubmission[]
}

function getStatusBadge(status: string) {
  switch (status) {
    case ChecklistSubmissionStatus.COMPLETED:
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Terminée</Badge>
    case ChecklistSubmissionStatus.IN_PROGRESS:
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">En cours</Badge>
    case ChecklistSubmissionStatus.CANCELLED:
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Annulée</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function ChecklistHistory({ submissions }: ChecklistHistoryProps) {
  if (submissions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Aucun historique de checklist disponible.
      </p>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Checklist</TableHead>
            <TableHead>Modèle avion</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((sub) => (
            <TableRow key={sub.id}>
              <TableCell className="whitespace-nowrap">
                {format(new Date(sub.started_at), "dd MMM yyyy HH:mm", { locale: fr })}
              </TableCell>
              <TableCell className="font-medium">{sub.template.name}</TableCell>
              <TableCell>{sub.template.aircraft_model}</TableCell>
              <TableCell>{getStatusBadge(sub.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
