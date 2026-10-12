"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { gql, useMutation, useQuery } from "@apollo/client"
import { FileText, Loader2, Plus, Search } from "lucide-react"
import {
  CREATE_LESSON,
  DELETE_LESSON,
  GET_COURSES,
  GET_MODULES_BY_COURSE,
  UPDATE_LESSON,
} from "@/graphql/learningAdmin"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { AttachmentsInput } from "@/components/ui/attachments-input"
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { toast } from "@/components/hooks/use-toast"
import { optionalIdField } from "@/lib/graphql-inputs"
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog"
import { FormField } from "./FormField"
import { RowActions } from "./RowActions"
import { lessonEditorHtml } from "./lesson-content"

// The lessons of a module with their text, so that modifying one opens on what is published.
export const GET_LESSONS_FOR_EDITING = gql`
  query GetLessonsByModuleForEditing($moduleId: Float!) {
    getLessonsByModule(moduleId: $moduleId) {
      id
      title
      description
      content
      video_url
      attachments
    }
  }
`

interface Option {
  id: number | string
  title: string
}

interface LessonRow {
  id: number | string
  title: string
  description?: string | null
  content?: unknown
  video_url?: string | null
  attachments?: string[] | null
  moduleId?: number | null
}

interface LessonForm {
  // Absent while creating a lesson.
  id: number | string | null
  moduleId: string
  // Only sent when the lesson carries it: the module of an existing lesson is left alone.
  currentModuleId?: number | null
  title: string
  description: string
  content: string
  videoUrl: string
  attachments: string[]
}

const emptyForm = (moduleId: string): LessonForm => ({
  id: null,
  moduleId,
  title: "",
  description: "",
  content: "",
  videoUrl: "",
  attachments: [],
})

// True when the editor holds nothing to read (it leaves empty tags behind).
const isBlankHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim() === "" && !/<img\b/i.test(html)

export function LessonManagement() {
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [selectedModuleId, setSelectedModuleId] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [form, setForm] = useState<LessonForm>(emptyForm(""))
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [lessonToDelete, setLessonToDelete] = useState<LessonRow | null>(null)

  const coursesQuery = useQuery<{ getCourses: Option[] }>(GET_COURSES, { fetchPolicy: "cache-and-network" })
  const courses = coursesQuery.data?.getCourses

  const modulesQuery = useQuery<{ getModulesByCourse: Option[] }>(GET_MODULES_BY_COURSE, {
    variables: { courseId: Number.parseInt(selectedCourseId, 10) },
    skip: !selectedCourseId,
    fetchPolicy: "cache-and-network",
  })
  const modules = selectedCourseId ? modulesQuery.data?.getModulesByCourse : undefined

  const { data, loading, error, refetch } = useQuery<{ getLessonsByModule: LessonRow[] }>(GET_LESSONS_FOR_EDITING, {
    variables: { moduleId: Number.parseInt(selectedModuleId, 10) },
    skip: !selectedModuleId,
    fetchPolicy: "cache-and-network",
  })
  const lessons = selectedModuleId ? data?.getLessonsByModule : undefined

  const [createLesson, { loading: creating }] = useMutation(CREATE_LESSON)
  const [updateLesson, { loading: updating }] = useMutation(UPDATE_LESSON)
  const [deleteLesson, { loading: deleting }] = useMutation(DELETE_LESSON)
  const saving = creating || updating
  const isEdit = form.id !== null

  // Lessons are listed module by module: start on the first course and its first module.
  useEffect(() => {
    if (!selectedCourseId && courses && courses.length > 0) {
      setSelectedCourseId(String(courses[0].id))
    }
  }, [courses, selectedCourseId])

  useEffect(() => {
    if (!modules) return
    const stillThere = modules.some((module) => String(module.id) === selectedModuleId)
    if (!stillThere) setSelectedModuleId(modules.length > 0 ? String(modules[0].id) : "")
  }, [modules, selectedModuleId])

  const openCreate = () => {
    setForm(emptyForm(selectedModuleId))
    setSubmitted(false)
    setIsFormOpen(true)
  }

  const openEdit = (lesson: LessonRow) => {
    setForm({
      id: lesson.id,
      moduleId: selectedModuleId,
      currentModuleId: lesson.moduleId,
      title: lesson.title,
      description: lesson.description ?? "",
      content: lessonEditorHtml(lesson.content),
      videoUrl: lesson.video_url ?? "",
      attachments: lesson.attachments ?? [],
    })
    setSubmitted(false)
    setIsFormOpen(true)
  }

  const errors = {
    moduleId: form.moduleId ? null : "Choisissez le module de la leçon.",
    title: form.title.trim() ? null : "Donnez un titre à la leçon.",
    content: isBlankHtml(form.content) ? "Rédigez le contenu de la leçon." : null,
    videoUrl:
      form.videoUrl.trim() && !/^https?:\/\//i.test(form.videoUrl.trim())
        ? "Collez l'adresse complète de la vidéo, en commençant par https://."
        : null,
  }
  const hasErrors = Object.values(errors).some(Boolean)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (hasErrors) return

    try {
      if (form.id !== null) {
        await updateLesson({
          variables: {
            id: Number(form.id),
            updateLessonInput: {
              title: form.title.trim(),
              description: form.description,
              content: form.content,
              video_url: form.videoUrl.trim(),
              attachments: form.attachments,
              ...optionalIdField("moduleId", form.currentModuleId),
            },
          },
        })
        toast({ title: "Leçon modifiée", description: "Les changements ont été enregistrés." })
      } else {
        await createLesson({
          variables: {
            createLessonInput: {
              title: form.title.trim(),
              description: form.description,
              content: form.content,
              video_url: form.videoUrl.trim(),
              attachments: form.attachments,
              moduleId: Number.parseInt(form.moduleId, 10),
            },
          },
        })
        toast({ title: "Leçon créée", description: "Elle est visible dès maintenant dans le cours." })
      }
      setIsFormOpen(false)
      // Show the module the lesson belongs to.
      if (form.moduleId === selectedModuleId) refetch()
      else setSelectedModuleId(form.moduleId)
    } catch {
      toast({
        title: isEdit ? "Leçon non modifiée" : "Leçon non créée",
        description: "L'enregistrement a échoué. Vérifiez les informations puis réessayez.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!lessonToDelete) return
    try {
      await deleteLesson({ variables: { id: Number(lessonToDelete.id) } })
      setLessonToDelete(null)
      refetch()
      toast({ title: "Leçon supprimée", description: "La leçon a été retirée du module." })
    } catch {
      toast({
        title: "Leçon non supprimée",
        description: "La suppression a échoué. Réessayez dans un instant.",
        variant: "destructive",
      })
    }
  }

  const search = searchTerm.trim().toLowerCase()
  const filteredLessons = (lessons ?? []).filter(
    (lesson) =>
      !search ||
      lesson.title.toLowerCase().includes(search) ||
      (lesson.description ?? "").toLowerCase().includes(search),
  )
  const hasCourses = (courses ?? []).length > 0
  const hasModules = (modules ?? []).length > 0

  const createButton = (
    <Button onClick={openCreate} disabled={!hasModules}>
      <Plus className="h-4 w-4" />
      Créer une leçon
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Select
          value={selectedCourseId}
          onValueChange={(value) => {
            setSelectedCourseId(value)
            setSelectedModuleId("")
            setSearchTerm("")
          }}
          disabled={!hasCourses}
        >
          <SelectTrigger className="w-full lg:w-56" aria-label="Cours">
            <SelectValue placeholder="Choisir un cours" />
          </SelectTrigger>
          <SelectContent>
            {(courses ?? []).map((course) => (
              <SelectItem key={course.id} value={String(course.id)}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedModuleId} onValueChange={setSelectedModuleId} disabled={!hasModules}>
          <SelectTrigger className="w-full lg:w-56" aria-label="Module dont afficher les leçons">
            <SelectValue placeholder={hasCourses && modules && !hasModules ? "Aucun module" : "Choisir un module"} />
          </SelectTrigger>
          <SelectContent>
            {(modules ?? []).map((module) => (
              <SelectItem key={module.id} value={String(module.id)}>
                {module.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Rechercher une leçon"
            placeholder="Rechercher une leçon, ex. altimétrie"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="lg:ml-auto">{createButton}</div>
      </div>

      {(coursesQuery.loading && !courses) ||
      (selectedCourseId && modulesQuery.loading && !modules) ||
      (selectedModuleId && loading && !lessons) ? (
        <div className="space-y-2 rounded-xl border bg-card p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : coursesQuery.error && !courses ? (
        <ErrorState onRetry={() => coursesQuery.refetch()} />
      ) : !hasCourses ? (
        <EmptyState
          icon={FileText}
          title="Créez d'abord un cours"
          description="Une leçon appartient à un module, lui-même rangé dans un cours. Commencez par l'onglet Cours."
        />
      ) : modulesQuery.error && !modules ? (
        <ErrorState onRetry={() => modulesQuery.refetch()} />
      ) : !hasModules ? (
        <EmptyState
          icon={FileText}
          title="Ce cours n'a pas encore de module"
          description="Ajoutez un module à ce cours dans l'onglet Modules, puis revenez créer ses leçons."
        />
      ) : error && !lessons ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filteredLessons.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search ? "Aucune leçon ne correspond" : "Ce module n'a pas encore de leçon"}
          description={search ? "Modifiez la recherche." : "Une leçon réunit un texte, une vidéo et des documents."}
          action={
            search ? (
              <Button variant="outline" onClick={() => setSearchTerm("")}>
                Effacer la recherche
              </Button>
            ) : (
              createButton
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-right">N°</TableHead>
                <TableHead>Leçon</TableHead>
                <TableHead>Vidéo</TableHead>
                <TableHead className="text-right">Pièces jointes</TableHead>
                <TableHead className="w-24">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLessons.map((lesson) => (
                <TableRow key={lesson.id}>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {(lessons ?? []).indexOf(lesson) + 1}
                  </TableCell>
                  <TableCell className="min-w-[14rem]">
                    <p className="font-medium">{lesson.title}</p>
                    {lesson.description && (
                      <p className="line-clamp-1 max-w-xl text-sm text-muted-foreground">{lesson.description}</p>
                    )}
                  </TableCell>
                  <TableCell>{lesson.video_url ? <Badge variant="info">Vidéo</Badge> : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{lesson.attachments?.length || "—"}</TableCell>
                  <TableCell>
                    <RowActions
                      name={`la leçon ${lesson.title}`}
                      onEdit={() => openEdit(lesson)}
                      onDelete={() => setLessonToDelete(lesson)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={(open) => !saving && setIsFormOpen(open)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Modifier la leçon" : "Créer une leçon"}</DialogTitle>
            <DialogDescription>
              Le texte est obligatoire ; la vidéo et les pièces jointes sont facultatives.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              {!isEdit && (
                <FormField label="Module" htmlFor="lesson-module" required error={submitted ? errors.moduleId : null}>
                  <Select value={form.moduleId} onValueChange={(value) => setForm({ ...form, moduleId: value })}>
                    <SelectTrigger id="lesson-module">
                      <SelectValue placeholder="Choisir un module" />
                    </SelectTrigger>
                    <SelectContent>
                      {(modules ?? []).map((module) => (
                        <SelectItem key={module.id} value={String(module.id)}>
                          {module.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
              <div className={isEdit ? "sm:col-span-2" : undefined}>
                <FormField label="Titre" htmlFor="lesson-title" required error={submitted ? errors.title : null}>
                  <Input
                    id="lesson-title"
                    placeholder="Ex. Lire un METAR"
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    aria-invalid={submitted && !!errors.title}
                  />
                </FormField>
              </div>
            </div>

            <FormField label="Description" htmlFor="lesson-description" hint="Une phrase affichée sous le titre de la leçon.">
              <Textarea
                id="lesson-description"
                placeholder="Ex. Décoder un message d'observation, groupe par groupe."
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={2}
              />
            </FormField>

            <FormField label="Contenu" required error={submitted ? errors.content : null}>
              <WysiwygEditor
                value={form.content}
                onChange={(content) => setForm((previous) => ({ ...previous, content }))}
                placeholder="Rédigez le texte de la leçon…"
                className=""
              />
            </FormField>

            <FormField
              label="Vidéo"
              htmlFor="lesson-video"
              error={submitted ? errors.videoUrl : null}
              hint="Facultatif. Collez le lien d'une vidéo YouTube."
            >
              <Input
                id="lesson-video"
                type="url"
                inputMode="url"
                placeholder="https://www.youtube.com/watch?v=…"
                value={form.videoUrl}
                onChange={(event) => setForm({ ...form, videoUrl: event.target.value })}
                aria-invalid={submitted && !!errors.videoUrl}
              />
            </FormField>

            <FormField label="Pièces jointes" hint="Facultatif. Des liens vers des documents à consulter ou à télécharger.">
              <AttachmentsInput
                className=""
                value={form.attachments}
                onChange={(attachments) => setForm((previous) => ({ ...previous, attachments }))}
              />
            </FormField>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Enregistrer" : "Créer la leçon"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={lessonToDelete !== null}
        onOpenChange={(open) => !open && setLessonToDelete(null)}
        title="Supprimer cette leçon ?"
        description={`La leçon « ${lessonToDelete?.title ?? ""} » sera définitivement supprimée, avec la progression des membres sur cette leçon.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
