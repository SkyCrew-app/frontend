"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
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
import { apiRefusal } from "@/lib/api-refusal"
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
  const { t } = useTranslation("instruction")
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

  const titleError = form.title.trim() ? null : t("admin.courses.form.titleError")

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
        toast({ title: t("admin.courses.toast.updated.title"), description: t("shared.changesSaved") })
      } else {
        await createCourse({ variables: { createCourseInput: input } })
        toast({
          title: t("admin.courses.toast.created.title"),
          description: t("admin.courses.toast.created.description"),
        })
      }
      setIsFormOpen(false)
      refetch()
    } catch {
      toast({
        title: isEdit ? t("admin.courses.toast.updateFailed.title") : t("admin.courses.toast.createFailed.title"),
        description: t("shared.saveFailed"),
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
      toast({
        title: t("admin.courses.toast.deleted.title"),
        description: t("admin.courses.toast.deleted.description"),
      })
    } catch (error) {
      toast({
        title: t("admin.courses.toast.deleteFailed.title"),
        description: apiRefusal(error, t("shared.deleteFailed")),
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
      {t("admin.courses.create")}
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t("admin.courses.searchAria")}
            placeholder={t("admin.courses.searchPlaceholder")}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterLicense} onValueChange={setFilterLicense}>
          <SelectTrigger className="w-full sm:w-52" aria-label={t("admin.courses.filterLicenceAria")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.courses.allLicences")}</SelectItem>
            <SelectItem value={NO_LICENSE}>{t("admin.courses.withoutLicence")}</SelectItem>
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
          title={isFiltered ? t("admin.courses.empty.filteredTitle") : t("admin.courses.empty.title")}
          description={
            isFiltered
              ? t("admin.courses.empty.filteredDescription")
              : t("admin.courses.empty.description")
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
                {t("common:actions.clearFilters")}
              </Button>
            ) : (
              createButton
            )
          }
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.shared.course")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("common:labels.category")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("admin.courses.requiredLicence")}</TableHead>
                <TableHead className="w-24">
                  <span className="sr-only">{t("common:labels.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <p className="break-words font-medium">{course.title}</p>
                    {course.description && (
                      <p className="line-clamp-1 max-w-xl text-sm text-muted-foreground">{course.description}</p>
                    )}
                    {/* Phones: category and licence under the title, their columns are hidden. */}
                    {(course.category || course.required_license) && (
                      <p className="mt-1 text-xs text-muted-foreground lg:hidden">
                        {[course.category, course.required_license].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{course.category || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{course.required_license || "—"}</TableCell>
                  <TableCell>
                    <RowActions
                      name={t("admin.courses.rowName", { title: course.title })}
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
        title={isEdit ? t("admin.courses.form.editTitle") : t("admin.courses.create")}
        description={
          isEdit
            ? t("admin.courses.form.editDescription")
            : t("admin.courses.form.createDescription")
        }
        onSubmit={handleSubmit}
        submitLabel={isEdit ? t("common:actions.save") : t("admin.courses.form.submitCreate")}
        submitting={saving}
      >
        <div className="space-y-4">
          <FormField label={t("admin.shared.title")} htmlFor="course-title" required error={submitted ? titleError : null}>
            <Input
              id="course-title"
              placeholder={t("admin.courses.form.titlePlaceholder")}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              aria-invalid={submitted && !!titleError}
            />
          </FormField>

          <FormField
            label={t("common:labels.description")}
            htmlFor="course-description"
            hint={t("admin.courses.form.descriptionHint")}
          >
            <Textarea
              id="course-description"
              placeholder={t("admin.courses.form.descriptionPlaceholder")}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={4}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("common:labels.category")} htmlFor="course-category">
              <Input
                id="course-category"
                placeholder={t("admin.courses.form.categoryPlaceholder")}
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              />
            </FormField>

            <FormField label={t("admin.courses.requiredLicence")} htmlFor="course-license">
              <Select value={form.license} onValueChange={(value) => setForm({ ...form, license: value })}>
                <SelectTrigger id="course-license">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LICENSE}>{t("admin.courses.noLicence")}</SelectItem>
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
        title={t("admin.courses.deleteConfirm.title")}
        description={t("admin.courses.deleteConfirm.description", { title: courseToDelete?.title ?? "" })}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
