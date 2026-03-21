"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ClipboardCheck, Plus, AlertTriangle, Clock, CheckCircle2, ArrowRight } from "lucide-react"
import { useToast } from "@/components/hooks/use-toast"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { GET_CHECKLIST_SUBMISSIONS, GET_CHECKLIST_TEMPLATES } from "@/graphql/checklist"
import { START_CHECKLIST_SUBMISSION } from "@/graphql/checklist"
import {
  ChecklistSubmission,
  ChecklistSubmissionStatus,
  ChecklistTemplate,
} from "@/interfaces/checklist"
import { ChecklistProgress } from "@/components/checklists/ChecklistProgress"

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
    case ChecklistSubmissionStatus.CANCELLED:
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          Annulée
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function ChecklistsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")

  const { data: submissionsData, loading: loadingSubmissions, error: errorSubmissions } = useQuery(
    GET_CHECKLIST_SUBMISSIONS,
    {
      fetchPolicy: "network-only",
    },
  )

  const { data: templatesData, loading: loadingTemplates } = useQuery(GET_CHECKLIST_TEMPLATES)

  const [startSubmission, { loading: starting }] = useMutation(START_CHECKLIST_SUBMISSION)

  const submissions: ChecklistSubmission[] = submissionsData?.checklistSubmissions || []
  const templates: ChecklistTemplate[] = templatesData?.checklistTemplates?.filter(
    (t: ChecklistTemplate) => t.is_active,
  ) || []

  // Group submissions: in_progress first, then completed
  const inProgress = submissions.filter((s) => s.status === ChecklistSubmissionStatus.IN_PROGRESS)
  const completed = submissions.filter((s) => s.status === ChecklistSubmissionStatus.COMPLETED)

  const getProgress = (sub: ChecklistSubmission) => {
    const totalItems = sub.template.items?.length || 0
    const checkedItems = sub.responses?.filter((r) => r.checked).length || 0
    return { checked: checkedItems, total: totalItems }
  }

  const handleStartChecklist = async () => {
    if (!selectedTemplateId || !userData?.id) return
    try {
      const { data } = await startSubmission({
        variables: {
          input: {
            templateId: Number(selectedTemplateId),
            responses: [],
          },
        },
        refetchQueries: [
          { query: GET_CHECKLIST_SUBMISSIONS },
        ],
      })

      setIsNewDialogOpen(false)
      setSelectedTemplateId("")

      if (data?.startChecklistSubmission?.id) {
        router.push(`/checklists/${data.startChecklistSubmission.id}`)
      }

      toast({
        title: "Checklist démarrée",
        description: "Vous pouvez maintenant remplir votre checklist.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: (error as Error).message || "Impossible de démarrer la checklist.",
      })
    }
  }

  if (loadingSubmissions) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  if (errorSubmissions) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
        <CardContent className="p-6 text-red-800 dark:text-red-300 flex items-center">
          <AlertTriangle className="h-6 w-6 mr-3" />
          <div>
            <h3 className="font-semibold">Erreur de chargement</h3>
            <p>Impossible de charger vos checklists. Veuillez réessayer plus tard.</p>
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl md:text-4xl">
              <ClipboardCheck className="h-6 w-6 text-primary sm:h-7 sm:w-7 md:h-8 md:w-8" />
              Checklists pré-vol
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Gérez et remplissez vos checklists de vérification avant le vol
            </p>
          </div>

          <Button onClick={() => setIsNewDialogOpen(true)} size="sm" className="w-full sm:w-auto gap-1">
            <Plus className="h-4 w-4" />
            Nouvelle checklist
          </Button>
        </div>
      </motion.div>

      {/* In progress */}
      {inProgress.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            En cours
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inProgress.map((sub) => {
              const { checked, total } = getProgress(sub)
              return (
                <Card
                  key={sub.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                  onClick={() => router.push(`/checklists/${sub.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{sub.template.name}</CardTitle>
                      {getStatusBadge(sub.status)}
                    </div>
                    <CardDescription>{sub.template.aircraft_model}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ChecklistProgress checked={checked} total={total} required={0} />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Démarrée le {format(new Date(sub.started_at), "dd MMM yyyy HH:mm", { locale: fr })}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Terminées
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completed.map((sub) => {
              const { checked, total } = getProgress(sub)
              return (
                <Card
                  key={sub.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/checklists/${sub.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{sub.template.name}</CardTitle>
                      {getStatusBadge(sub.status)}
                    </div>
                    <CardDescription>{sub.template.aircraft_model}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{checked}/{total} items</span>
                      <span>
                        {sub.completed_at &&
                          format(new Date(sub.completed_at), "dd MMM yyyy HH:mm", { locale: fr })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {submissions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">Aucune checklist</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Démarrez une nouvelle checklist pré-vol pour commencer.
            </p>
            <Button onClick={() => setIsNewDialogOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              Nouvelle checklist
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New checklist dialog */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Nouvelle checklist pré-vol</DialogTitle>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Modèle de checklist</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un modèle..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={String(t.id)} value={String(t.id)}>
                      {t.name} — {t.aircraft_model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingTemplates && <p className="text-xs text-muted-foreground">Chargement des modèles...</p>}
              {templates.length === 0 && !loadingTemplates && (
                <p className="text-xs text-red-500">Aucun modèle de checklist actif disponible.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleStartChecklist} disabled={!selectedTemplateId || starting}>
              {starting ? "Démarrage..." : "Démarrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
