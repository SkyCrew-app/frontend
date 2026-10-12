"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useMutation, useQuery } from "@apollo/client"
import { Layers, Loader2, Plus, Search } from "lucide-react"
import {
  CREATE_MODULE,
  DELETE_MODULE,
  GET_COURSES,
  GET_MODULES_BY_COURSE,
  UPDATE_MODULE,
} from "@/graphql/learningAdmin"
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
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { toast } from "@/components/hooks/use-toast"
import { optionalIdField } from "@/lib/graphql-inputs"
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog"
import { FormField } from "./FormField"
import { RowActions } from "./RowActions"

interface CourseOption {
  id: number | string
  title: string
}

interface ModuleRow {
  id: number | string
  title: string
  description?: string | null
  courseId?: number | null
}

interface ModuleForm {
  // Absent while creating a module.
  id: number | string | null
  courseId: string
  // Only sent when the module carries it: the course of an existing module is left alone.
  currentCourseId?: number | null
  title: string
  description: string
}

export function ModuleManagement() {
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [form, setForm] = useState<ModuleForm>({ id: null, courseId: "", title: "", description: "" })
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [moduleToDelete, setModuleToDelete] = useState<ModuleRow | null>(null)

  const coursesQuery = useQuery<{ getCourses: CourseOption[] }>(GET_COURSES, { fetchPolicy: "cache-and-network" })
  const courses = coursesQuery.data?.getCourses

  const { data, loading, error, refetch } = useQuery<{ getModulesByCourse: ModuleRow[] }>(GET_MODULES_BY_COURSE, {
    variables: { courseId: Number.parseFloat(selectedCourseId) },
    skip: !selectedCourseId,
    fetchPolicy: "cache-and-network",
  })

  const [createModule, { loading: creating }] = useMutation(CREATE_MODULE)
  const [updateModule, { loading: updating }] = useMutation(UPDATE_MODULE)
  const [deleteModule, { loading: deleting }] = useMutation(DELETE_MODULE)
  const saving = creating || updating
  const isEdit = form.id !== null

  // Modules are listed course by course: start on the first one.
  useEffect(() => {
    if (!selectedCourseId && courses && courses.length > 0) {
      setSelectedCourseId(String(courses[0].id))
    }
  }, [courses, selectedCourseId])

  const openCreate = () => {
    setForm({ id: null, courseId: selectedCourseId, title: "", description: "" })
    setSubmitted(false)
    setIsFormOpen(true)
  }

  const openEdit = (module: ModuleRow) => {
    setForm({
      id: module.id,
      courseId: selectedCourseId,
      currentCourseId: module.courseId,
      title: module.title,
      description: module.description ?? "",
    })
    setSubmitted(false)
    setIsFormOpen(true)
  }

  const errors = {
    courseId: form.courseId ? null : "Choisissez le cours du module.",
    title: form.title.trim() ? null : "Donnez un titre au module.",
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (errors.courseId || errors.title) return

    try {
      if (form.id !== null) {
        await updateModule({
          variables: {
            id: Number(form.id),
            updateModuleInput: {
              title: form.title.trim(),
              description: form.description,
              ...optionalIdField("courseId", form.currentCourseId),
            },
          },
        })
        toast({ title: "Module modifié", description: "Les changements ont été enregistrés." })
        refetch()
      } else {
        await createModule({
          variables: {
            createModuleInput: {
              title: form.title.trim(),
              description: form.description,
              courseId: Number.parseInt(form.courseId, 10),
            },
          },
        })
        toast({ title: "Module créé", description: "Ajoutez-lui maintenant des leçons dans l'onglet Leçons." })
        // Show the course the module was added to.
        if (form.courseId === selectedCourseId) refetch()
        else setSelectedCourseId(form.courseId)
      }
      setIsFormOpen(false)
    } catch {
      toast({
        title: isEdit ? "Module non modifié" : "Module non créé",
        description: "L'enregistrement a échoué. Vérifiez les informations puis réessayez.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!moduleToDelete) return
    try {
      await deleteModule({ variables: { id: Number(moduleToDelete.id) } })
      setModuleToDelete(null)
      refetch()
      toast({ title: "Module supprimé", description: "Le module a été retiré du cours." })
    } catch {
      toast({
        title: "Module non supprimé",
        description: "La suppression a échoué. Réessayez dans un instant.",
        variant: "destructive",
      })
    }
  }

  const search = searchTerm.trim().toLowerCase()
  const modules = selectedCourseId ? data?.getModulesByCourse : undefined
  const filteredModules = (modules ?? []).filter(
    (module) =>
      !search ||
      module.title.toLowerCase().includes(search) ||
      (module.description ?? "").toLowerCase().includes(search),
  )
  const hasCourses = (courses ?? []).length > 0

  const createButton = (
    <Button onClick={openCreate} disabled={!hasCourses}>
      <Plus className="h-4 w-4" />
      Créer un module
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={selectedCourseId} onValueChange={setSelectedCourseId} disabled={!hasCourses}>
          <SelectTrigger className="w-full sm:w-64" aria-label="Cours dont afficher les modules">
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
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Rechercher un module"
            placeholder="Rechercher un module, ex. circulation aérienne"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="sm:ml-auto">{createButton}</div>
      </div>

      {(coursesQuery.loading && !courses) || (selectedCourseId && loading && !modules) ? (
        <div className="space-y-2 rounded-xl border bg-card p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : coursesQuery.error && !courses ? (
        <ErrorState onRetry={() => coursesQuery.refetch()} />
      ) : !hasCourses ? (
        <EmptyState
          icon={Layers}
          title="Créez d'abord un cours"
          description="Un module appartient à un cours : ajoutez un cours dans l'onglet Cours, puis revenez ici."
        />
      ) : error && !modules ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filteredModules.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={search ? "Aucun module ne correspond" : "Ce cours n'a pas encore de module"}
          description={search ? "Modifiez la recherche." : "Les modules découpent le cours en chapitres."}
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
                <TableHead>Module</TableHead>
                <TableHead className="w-24">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModules.map((module) => (
                <TableRow key={module.id}>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {(modules ?? []).indexOf(module) + 1}
                  </TableCell>
                  <TableCell className="min-w-[14rem]">
                    <p className="font-medium">{module.title}</p>
                    {module.description && (
                      <p className="line-clamp-1 max-w-xl text-sm text-muted-foreground">{module.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <RowActions
                      name={`le module ${module.title}`}
                      onEdit={() => openEdit(module)}
                      onDelete={() => setModuleToDelete(module)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={(open) => !saving && setIsFormOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Modifier le module" : "Créer un module"}</DialogTitle>
            <DialogDescription>Un module est un chapitre du cours : il regroupe des leçons.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {!isEdit && (
              <FormField label="Cours" htmlFor="module-course" required error={submitted ? errors.courseId : null}>
                <Select value={form.courseId} onValueChange={(value) => setForm({ ...form, courseId: value })}>
                  <SelectTrigger id="module-course">
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
              </FormField>
            )}

            <FormField label="Titre" htmlFor="module-title" required error={submitted ? errors.title : null}>
              <Input
                id="module-title"
                placeholder="Ex. Les masses d'air et les fronts"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                aria-invalid={submitted && !!errors.title}
              />
            </FormField>

            <FormField label="Description" htmlFor="module-description" hint="Une phrase sur ce que couvre le module.">
              <Textarea
                id="module-description"
                placeholder="Ex. Reconnaître les fronts et anticiper leurs effets sur le vol."
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={3}
              />
            </FormField>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Enregistrer" : "Créer le module"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={moduleToDelete !== null}
        onOpenChange={(open) => !open && setModuleToDelete(null)}
        title="Supprimer ce module ?"
        description={`Le module « ${moduleToDelete?.title ?? ""} » sera définitivement supprimé, avec ses leçons.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
