"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery } from "@apollo/client"
import { Layers, Plus, Search } from "lucide-react"
import {
  CREATE_MODULE,
  DELETE_MODULE,
  GET_COURSES,
  GET_MODULES_BY_COURSE,
  UPDATE_MODULE,
} from "@/graphql/learningAdmin"
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
import { optionalIdField } from "@/lib/graphql-inputs"
import { apiRefusal } from "@/lib/api-refusal"
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

interface ModuleManagementProps {
  /** The course shown, when the page keeps it from one tab to the next. */
  courseId?: string
  onCourseChange?: (courseId: string) => void
}

export function ModuleManagement({ courseId, onCourseChange }: ModuleManagementProps = {}) {
  const { t } = useTranslation("instruction")
  const [ownCourseId, setOwnCourseId] = useState("")
  const selectedCourseId = courseId ?? ownCourseId
  const setSelectedCourseId = onCourseChange ?? setOwnCourseId
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
    courseId: form.courseId ? null : t("admin.modules.form.courseError"),
    title: form.title.trim() ? null : t("admin.modules.form.titleError"),
  }

  const handleSubmit = async () => {
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
        toast({ title: t("admin.modules.toast.updated.title"), description: t("shared.changesSaved") })
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
        toast({
          title: t("admin.modules.toast.created.title"),
          description: t("admin.modules.toast.created.description"),
        })
        // Show the course the module was added to.
        if (form.courseId === selectedCourseId) refetch()
        else setSelectedCourseId(form.courseId)
      }
      setIsFormOpen(false)
    } catch {
      toast({
        title: isEdit ? t("admin.modules.toast.updateFailed.title") : t("admin.modules.toast.createFailed.title"),
        description: t("shared.saveFailed"),
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
      toast({
        title: t("admin.modules.toast.deleted.title"),
        description: t("admin.modules.toast.deleted.description"),
      })
    } catch (error) {
      toast({
        title: t("admin.modules.toast.deleteFailed.title"),
        description: apiRefusal(error, t("shared.deleteFailed")),
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
      {t("admin.modules.create")}
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={selectedCourseId} onValueChange={setSelectedCourseId} disabled={!hasCourses}>
          <SelectTrigger className="w-full sm:w-64" aria-label={t("admin.modules.courseFilterAria")}>
            <SelectValue placeholder={t("admin.shared.chooseCourse")} />
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
            aria-label={t("admin.modules.searchAria")}
            placeholder={t("admin.modules.searchPlaceholder")}
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
          title={t("admin.shared.createCourseFirst")}
          description={t("admin.modules.empty.noCourseDescription")}
        />
      ) : error && !modules ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filteredModules.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={search ? t("admin.modules.empty.filteredTitle") : t("admin.shared.noModuleYet")}
          description={search ? t("admin.shared.changeSearch") : t("admin.modules.empty.description")}
          action={
            search ? (
              <Button variant="outline" onClick={() => setSearchTerm("")}>
                {t("admin.shared.clearSearch")}
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
                <TableHead className="w-12 text-right">{t("admin.shared.number")}</TableHead>
                <TableHead>{t("admin.shared.module")}</TableHead>
                <TableHead className="w-24">
                  <span className="sr-only">{t("common:labels.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModules.map((module) => (
                <TableRow key={module.id}>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {(modules ?? []).indexOf(module) + 1}
                  </TableCell>
                  <TableCell>
                    <p className="break-words font-medium">{module.title}</p>
                    {module.description && (
                      <p className="line-clamp-1 max-w-xl text-sm text-muted-foreground">{module.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <RowActions
                      name={t("admin.modules.rowName", { title: module.title })}
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

      <SidePanel
        open={isFormOpen}
        onOpenChange={(open) => !saving && setIsFormOpen(open)}
        title={isEdit ? t("admin.modules.form.editTitle") : t("admin.modules.create")}
        description={t("admin.modules.form.description")}
        onSubmit={handleSubmit}
        submitLabel={isEdit ? t("common:actions.save") : t("admin.modules.form.submitCreate")}
        submitting={saving}
      >
        <div className="space-y-4">
          {!isEdit && (
            <FormField
              label={t("admin.shared.course")}
              htmlFor="module-course" required error={submitted ? errors.courseId : null}>
              <Select value={form.courseId} onValueChange={(value) => setForm({ ...form, courseId: value })}>
                <SelectTrigger id="module-course">
                  <SelectValue placeholder={t("admin.shared.chooseCourse")} />
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

          <FormField label={t("admin.shared.title")} htmlFor="module-title" required error={submitted ? errors.title : null}>
            <Input
              id="module-title"
              placeholder={t("admin.modules.form.titlePlaceholder")}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              aria-invalid={submitted && !!errors.title}
            />
          </FormField>

          <FormField
            label={t("common:labels.description")}
            htmlFor="module-description"
            hint={t("admin.modules.form.descriptionHint")}
          >
            <Textarea
              id="module-description"
              placeholder={t("admin.modules.form.descriptionPlaceholder")}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={3}
            />
          </FormField>
        </div>
      </SidePanel>

      <ConfirmDeleteDialog
        open={moduleToDelete !== null}
        onOpenChange={(open) => !open && setModuleToDelete(null)}
        title={t("admin.modules.deleteConfirm.title")}
        description={t("admin.modules.deleteConfirm.description", { title: moduleToDelete?.title ?? "" })}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
