"use client"

import { useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "@apollo/client"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, AlertTriangle, ClipboardCheck, CheckCircle2, Clock } from "lucide-react"
import { useToast } from "@/components/hooks/use-toast"
import {
  GET_CHECKLIST_SUBMISSION,
  UPDATE_CHECKLIST_SUBMISSION,
  COMPLETE_CHECKLIST_SUBMISSION,
} from "@/graphql/checklist"
import {
  ChecklistSubmission,
  ChecklistSubmissionStatus,
  ChecklistResponse,
} from "@/interfaces/checklist"
import { ChecklistForm } from "@/components/checklists/ChecklistForm"

function getStatusBadge(status: string) {
  switch (status) {
    case ChecklistSubmissionStatus.COMPLETED:
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Terminée
        </Badge>
      )
    case ChecklistSubmissionStatus.IN_PROGRESS:
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 gap-1">
          <Clock className="h-3 w-3" />
          En cours
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function ChecklistDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const id = Number(params.id)

  const { data, loading, error } = useQuery(GET_CHECKLIST_SUBMISSION, {
    variables: { id },
    skip: !id,
    fetchPolicy: "network-only",
  })

  const [updateSubmission] = useMutation(UPDATE_CHECKLIST_SUBMISSION)
  const [completeSubmission] = useMutation(COMPLETE_CHECKLIST_SUBMISSION)

  const submission: ChecklistSubmission | undefined = data?.checklistSubmission

  const handleUpdate = useCallback(
    async (responses: ChecklistResponse[]) => {
      try {
        await updateSubmission({
          variables: {
            input: {
              id,
              responses: responses.map(r => ({
                itemId: r.itemId,
                checked: r.checked,
                note: r.note || undefined,
              })),
            },
          },
        })
      } catch (error) {
        console.error("Auto-save error:", error)
        toast({
          variant: "destructive",
          title: "Erreur de sauvegarde",
          description: "Les modifications n'ont pas pu être enregistrées.",
        })
      }
    },
    [id, updateSubmission, toast],
  )

  const handleComplete = useCallback(async () => {
    try {
      await completeSubmission({
        variables: { id },
        refetchQueries: [{ query: GET_CHECKLIST_SUBMISSION, variables: { id } }],
      })
      toast({
        title: "Checklist terminée",
        description: "La checklist a été complétée avec succès.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: (error as Error).message || "Impossible de terminer la checklist.",
      })
    }
  }, [id, completeSubmission, toast])

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (error || !submission) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
        <CardContent className="p-6 text-red-800 dark:text-red-300 flex items-center">
          <AlertTriangle className="h-6 w-6 mr-3" />
          <div>
            <h3 className="font-semibold">Erreur de chargement</h3>
            <p>Impossible de charger la checklist. Veuillez réessayer plus tard.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button
          variant="ghost"
          onClick={() => router.push("/checklists")}
          className="mb-4 gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux checklists
        </Button>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-xl">{submission.template.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {submission.template.aircraft_model}
                    {submission.template.description && ` — ${submission.template.description}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(submission.status)}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(submission.started_at), "dd MMM yyyy HH:mm", { locale: fr })}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChecklistForm
              submission={submission}
              items={submission.template.items || []}
              onUpdate={handleUpdate}
              onComplete={handleComplete}
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
