"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { ClipboardCheck, Plus, Pencil, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/hooks/use-toast"
import {
  GET_CHECKLIST_TEMPLATES,
  CREATE_CHECKLIST_TEMPLATE,
  UPDATE_CHECKLIST_TEMPLATE,
} from "@/graphql/checklist"
import type { ChecklistTemplate } from "@/interfaces/checklist"

export default function AdminChecklistsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    aircraft_model: "",
    description: "",
  })

  const { data, loading, error } = useQuery(GET_CHECKLIST_TEMPLATES, {
    fetchPolicy: "network-only",
  })

  const [createTemplate, { loading: creating }] = useMutation(CREATE_CHECKLIST_TEMPLATE)
  const [updateTemplate] = useMutation(UPDATE_CHECKLIST_TEMPLATE)

  const templates: ChecklistTemplate[] = data?.checklistTemplates || []

  const handleCreate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.aircraft_model.trim()) return
    try {
      await createTemplate({
        variables: {
          input: {
            name: newTemplate.name,
            aircraft_model: newTemplate.aircraft_model,
            description: newTemplate.description,
          },
        },
        refetchQueries: [{ query: GET_CHECKLIST_TEMPLATES }],
      })

      setNewTemplate({ name: "", aircraft_model: "", description: "" })
      setIsCreateOpen(false)
      toast({
        title: "Modèle créé",
        description: "Le modèle de checklist a été créé avec succès.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: (error as Error).message || "Impossible de créer le modèle.",
      })
    }
  }

  const handleToggleActive = async (template: ChecklistTemplate) => {
    try {
      await updateTemplate({
        variables: {
          input: {
            id: Number(template.id),
            is_active: !template.is_active,
          },
        },
        refetchQueries: [{ query: GET_CHECKLIST_TEMPLATES }],
      })
      toast({
        title: template.is_active ? "Modèle désactivé" : "Modèle activé",
        description: `Le modèle "${template.name}" a été ${template.is_active ? "désactivé" : "activé"}.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: (error as Error).message || "Impossible de modifier le statut.",
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
        <CardContent className="p-6 text-red-800 dark:text-red-300 flex items-center">
          <AlertTriangle className="h-6 w-6 mr-3" />
          <div>
            <h3 className="font-semibold">Erreur de chargement</h3>
            <p>Impossible de charger les modèles de checklists.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b">
      <div className="container mx-auto px-2 py-6 sm:px-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl md:text-4xl">
                <ClipboardCheck className="h-6 w-6 text-primary sm:h-7 sm:w-7 md:h-8 md:w-8" />
                Gestion des Checklists
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Gérez les modèles de checklists pré-vol pour votre flotte
              </p>
            </div>

            <Button onClick={() => setIsCreateOpen(true)} size="sm" className="w-full sm:w-auto">
              <Plus className="mr-1.5 h-4 w-4" />
              <span>Créer un modèle</span>
            </Button>
          </div>

          <Card className="border-t-4 border-t-primary shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl">Modèles de checklists</CardTitle>
              <CardDescription>
                Consultez et gérez les modèles de checklists pré-vol
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun modèle de checklist.</p>
                  <p className="text-sm mt-1">Créez votre premier modèle pour commencer.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Modèle avion</TableHead>
                        <TableHead className="text-center">Items</TableHead>
                        <TableHead className="text-center">Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell>{template.aircraft_model}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{template.items?.length || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Switch
                                checked={template.is_active}
                                onCheckedChange={() => handleToggleActive(template)}
                              />
                              <Badge
                                variant={template.is_active ? "default" : "secondary"}
                                className={
                                  template.is_active
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    : ""
                                }
                              >
                                {template.is_active ? "Actif" : "Inactif"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/administration/checklists/${template.id}`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Create template dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Créer un modèle de checklist</DialogTitle>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nom du modèle</Label>
              <Input
                id="template-name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Ex: Checklist C172"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-model">Modèle d&apos;avion</Label>
              <Input
                id="template-model"
                value={newTemplate.aircraft_model}
                onChange={(e) => setNewTemplate({ ...newTemplate, aircraft_model: e.target.value })}
                placeholder="Ex: Cessna 172"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-desc">Description (optionnel)</Label>
              <Textarea
                id="template-desc"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Description du modèle de checklist..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newTemplate.name.trim() || !newTemplate.aircraft_model.trim() || creating}
            >
              {creating ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
