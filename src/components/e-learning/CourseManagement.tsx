"use client"

import { useState } from "react"
import { useMutation, useQuery } from "@apollo/client"
import { BookOpen, Plus, Search } from "lucide-react"
import { CREATE_COURSE, DELETE_COURSE, GET_COURSES, UPDATE_COURSE } from "@/graphql/learningAdmin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { SidePanel } from "@/components/layout/SidePanel"
import { toast } from "@/components/hooks/use-toast"
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog"
import { FormField } from "./FormField"
import { RowActions } from "./RowActions"

const LICENSES = ["PPL", "CPL", "ATPL"]
// The select needs a value for "no licence"; the API gets null.
const NO_LICENSE = "none"

interface CourseRow {
  id: number | string
  title: string
  description?: string | null
  category?: string | null
  required_license?: string | null
}

interface CourseForm {
  // Absent while creating a course.
  id: number | string | null
  title: string
  description: string
  category: string
  license: string
}

const emptyForm: CourseForm = { id: null, title: "", description: "", category: "", license: NO_LICENSE }

export function CourseManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterLicense, setFilterLicense] = useState("all")
  const [form, setForm] = useState<CourseForm>(emptyForm)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<CourseRow | null>(null)

  const { data, loading, error, refetch } = useQuery<{ getCourses: CourseRow[] }>(GET_COURSES, {
    fetchPolicy: "cache-and-network",
  })
  const [createCourse, { loading: creating }] = useMutation(CREATE_COURSE)
  const [updateCourse, { loading: updating }] = useMutation(UPDATE_COURSE)
  const [deleteCourse, { loading: deleting }] = useMutation(DELETE_COURSE)
  const saving = creating || updating
  const isEdit = form.id !== null

  const openCreate = () => {
    setForm(emptyForm)
    setSubmitted(false)
    setIsFormOpen(true)
  }

  const openEdit = (course: CourseRow) => {
    setForm({
      id: course.id,
      title: course.title,
      description: course.description ?? "",
      category: course.category ?? "",
      license: course.required_license || NO_LICENSE,
    })
    setSubmitted(false)
    setIsFormOpen(true)
  }

  const titleError = form.title.trim() ? null : "Donnez un titre au cours."

  const handleSubmit = async () => {
    setSubmitted(true)
    if (titleError) return

    const input = {
      title: form.title.trim(),
      description: form.description,
      category: form.category.trim(),
      required_license: form.license === NO_LICENSE ? null : form.license,
    }

    try {
      if (form.id !== null) {
        await updateCourse({ variables: { id: Number(form.id), updateCourseInput: input } })
        toast({ title: "Cours modifié", description: "Les changements ont été enregistrés." })
      } else {
        await createCourse({ variables: { createCourseInput: input } })
        toast({ title: "Cours créé", description: "Ajoutez-lui maintenant des modules dans l'onglet Modules." })
      }
      setIsFormOpen(false)
      refetch()
    } catch {
      toast({
        title: isEdit ? "Cours non modifié" : "Cours non créé",
        description: "L'enregistrement a échoué. Vérifiez les informations puis réessayez.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!courseToDelete) return
    try {
      await deleteCourse({ variables: { id: Number(courseToDelete.id) } })
      setCourseToDelete(null)
      refetch()
      toast({ title: "Cours supprimé", description: "Le cours a été retiré du catalogue." })
    } catch {
      toast({
        title: "Cours non supprimé",
        description: "La suppression a échoué. Réessayez dans un instant.",
        variant: "destructive",
      })
    }
  }

  const search = searchTerm.trim().toLowerCase()
  const courses = data?.getCourses
  const filteredCourses = (courses ?? []).filter((course) => {
    const matchesSearch =
      !search ||
      course.title.toLowerCase().includes(search) ||
      (course.description ?? "").toLowerCase().includes(search) ||
      (course.category ?? "").toLowerCase().includes(search)
    const matchesLicense =
      filterLicense === "all" ||
      (filterLicense === NO_LICENSE ? !course.required_license : course.required_license === filterLicense)
    return matchesSearch && matchesLicense
  })
  const isFiltered = search !== "" || filterLicense !== "all"

  const createButton = (
    <Button onClick={openCreate}>
      <Plus className="h-4 w-4" />
      Créer un cours
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Rechercher un cours"
            placeholder="Rechercher un cours, ex. navigation"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterLicense} onValueChange={setFilterLicense}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Filtrer par licence requise">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les licences</SelectItem>
            <SelectItem value={NO_LICENSE}>Sans licence requise</SelectItem>
            {LICENSES.map((license) => (
              <SelectItem key={license} value={license}>
                {license}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="sm:ml-auto">{createButton}</div>
      </div>

      {loading && !courses ? (
        <div className="space-y-2 rounded-xl border bg-card p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : error && !courses ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={isFiltered ? "Aucun cours ne correspond" : "Aucun cours pour le moment"}
          description={
            isFiltered
              ? "Modifiez la recherche ou le filtre de licence."
              : "Créez un premier cours, puis ajoutez-lui des modules et des leçons."
          }
          action={
            isFiltered ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setFilterLicense("all")
                }}
              >
                Effacer les filtres
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
                <TableHead>Cours</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Licence requise</TableHead>
                <TableHead className="w-24">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="min-w-[14rem]">
                    <p className="font-medium">{course.title}</p>
                    {course.description && (
                      <p className="line-clamp-1 max-w-xl text-sm text-muted-foreground">{course.description}</p>
                    )}
                  </TableCell>
                  <TableCell>{course.category || "—"}</TableCell>
                  <TableCell>{course.required_license || "—"}</TableCell>
                  <TableCell>
                    <RowActions
                      name={`le cours ${course.title}`}
                      onEdit={() => openEdit(course)}
                      onDelete={() => setCourseToDelete(course)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SidePanel
        open={isFormOpen}
        onOpenChange={(open) => !saving && setIsFormOpen(open)}
        title={isEdit ? "Modifier le cours" : "Créer un cours"}
        description={
          isEdit
            ? "Ces informations sont visibles dans le catalogue des membres."
            : "Le cours apparaît dans le catalogue ; ses modules et ses leçons s'ajoutent ensuite."
        }
        onSubmit={handleSubmit}
        submitLabel={isEdit ? "Enregistrer" : "Créer le cours"}
        submitting={saving}
      >
        <div className="space-y-4">
          <FormField label="Titre" htmlFor="course-title" required error={submitted ? titleError : null}>
            <Input
              id="course-title"
              placeholder="Ex. Météorologie pour le PPL"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              aria-invalid={submitted && !!titleError}
            />
          </FormField>

          <FormField label="Description" htmlFor="course-description" hint="Deux ou trois phrases sur ce que le cours apprend.">
            <Textarea
              id="course-description"
              placeholder="Ex. Lire une carte TEMSI, comprendre les fronts et préparer un vol en sécurité."
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={4}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Catégorie" htmlFor="course-category">
              <Input
                id="course-category"
                placeholder="Ex. Navigation"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              />
            </FormField>

            <FormField label="Licence requise" htmlFor="course-license">
              <Select value={form.license} onValueChange={(value) => setForm({ ...form, license: value })}>
                <SelectTrigger id="course-license">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LICENSE}>Aucune</SelectItem>
                  {LICENSES.map((license) => (
                    <SelectItem key={license} value={license}>
                      {license}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </div>
      </SidePanel>

      <ConfirmDeleteDialog
        open={courseToDelete !== null}
        onOpenChange={(open) => !open && setCourseToDelete(null)}
        title="Supprimer ce cours ?"
        description={`Le cours « ${courseToDelete?.title ?? ""} » sera définitivement supprimé, avec ses modules et ses leçons.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
