"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { gql, useMutation, useQuery } from "@apollo/client"
import { FileText, Plus, Search } from "lucide-react"
import {
  CREATE_LESSON,
  DELETE_LESSON,
  GET_COURSES,
  GET_MODULES_BY_COURSE,
  UPDATE_LESSON,
} from "@/graphql/learningAdmin"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { AttachmentsInput } from "@/components/ui/attachments-input"
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { SidePanel } from "@/components/layout/SidePanel"
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

interface LessonManagementProps {
  /** The course shown, when the page keeps it from one tab to the next. */
  courseId?: string
  onCourseChange?: (courseId: string) => void
}

export function LessonManagement({ courseId, onCourseChange }: LessonManagementProps = {}) {
  const { t } = useTranslation("instruction")
  const [ownCourseId, setOwnCourseId] = useState("")
  const selectedCourseId = courseId ?? ownCourseId
  const setSelectedCourseId = onCourseChange ?? setOwnCourseId
  const [selectedModuleId, setSelectedModuleId] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [form, setForm] = useState<LessonForm>(emptyForm(""))
  const [isFormOpen, setIsFormOpen] = useState(false)
  // The steps whose errors are shown: each one once the user tried to leave it.
  const [checked, setChecked] = useState({ presentation: false, content: false })
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
    setChecked({ presentation: false, content: false })
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
    setChecked({ presentation: false, content: false })
    setIsFormOpen(true)
  }

  const errors = {
    moduleId: form.moduleId ? null : t("admin.lessons.form.moduleError"),
    title: form.title.trim() ? null : t("admin.lessons.form.titleError"),
    content: isBlankHtml(form.content) ? t("admin.lessons.form.contentError") : null,
    videoUrl:
      form.videoUrl.trim() && !/^https?:\/\//i.test(form.videoUrl.trim())
        ? t("admin.lessons.form.videoError")
        : null,
  }
  const hasErrors = Object.values(errors).some(Boolean)

  const validatePresentation = () => {
    setChecked((previous) => ({ ...previous, presentation: true }))
    return !errors.moduleId && !errors.title && !errors.videoUrl
  }

  const validateContent = () => {
    setChecked((previous) => ({ ...previous, content: true }))
    return !errors.content
  }

  const handleSubmit = async () => {
    setChecked({ presentation: true, content: true })
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
        toast({ title: t("admin.lessons.toast.updated.title"), description: t("shared.changesSaved") })
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
        toast({
          title: t("admin.lessons.toast.created.title"),
          description: t("admin.lessons.toast.created.description"),
        })
      }
      setIsFormOpen(false)
      // Show the module the lesson belongs to.
      if (form.moduleId === selectedModuleId) refetch()
      else setSelectedModuleId(form.moduleId)
    } catch {
      toast({
        title: isEdit ? t("admin.lessons.toast.updateFailed.title") : t("admin.lessons.toast.createFailed.title"),
        description: t("shared.saveFailed"),
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
      toast({
        title: t("admin.lessons.toast.deleted.title"),
        description: t("admin.lessons.toast.deleted.description"),
      })
    } catch {
      toast({
        title: t("admin.lessons.toast.deleteFailed.title"),
        description: t("shared.deleteFailed"),
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
      {t("admin.lessons.create")}
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
          <SelectTrigger className="w-full lg:w-56" aria-label={t("admin.shared.course")}>
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
        <Select value={selectedModuleId} onValueChange={setSelectedModuleId} disabled={!hasModules}>
          <SelectTrigger className="w-full lg:w-56" aria-label={t("admin.lessons.moduleFilterAria")}>
            <SelectValue
              placeholder={
                hasCourses && modules && !hasModules ? t("admin.lessons.noModule") : t("admin.shared.chooseModule")
              }
            />
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
            aria-label={t("admin.lessons.searchAria")}
            placeholder={t("admin.lessons.searchPlaceholder")}
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
          title={t("admin.shared.createCourseFirst")}
          description={t("admin.lessons.empty.noCourseDescription")}
        />
      ) : modulesQuery.error && !modules ? (
        <ErrorState onRetry={() => modulesQuery.refetch()} />
      ) : !hasModules ? (
        <EmptyState
          icon={FileText}
          title={t("admin.shared.noModuleYet")}
          description={t("admin.lessons.empty.noModuleDescription")}
        />
      ) : error && !lessons ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filteredLessons.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search ? t("admin.lessons.empty.filteredTitle") : t("admin.lessons.empty.title")}
          description={search ? t("admin.shared.changeSearch") : t("admin.lessons.empty.description")}
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
                <TableHead>{t("admin.lessons.columns.lesson")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("admin.lessons.columns.video")}</TableHead>
                <TableHead className="hidden text-right lg:table-cell">{t("admin.lessons.columns.attachments")}</TableHead>
                <TableHead className="w-24">
                  <span className="sr-only">{t("common:labels.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLessons.map((lesson) => (
                <TableRow key={lesson.id}>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {(lessons ?? []).indexOf(lesson) + 1}
                  </TableCell>
                  <TableCell>
                    <p className="break-words font-medium">{lesson.title}</p>
                    {lesson.description && (
                      <p className="line-clamp-1 max-w-xl text-sm text-muted-foreground">{lesson.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {lesson.video_url ? <Badge variant="info">{t("admin.lessons.columns.video")}</Badge> : "—"}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums lg:table-cell">
                    {lesson.attachments?.length || "—"}
                  </TableCell>
                  <TableCell>
                    <RowActions
                      name={t("admin.lessons.rowName", { title: lesson.title })}
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

      <SidePanel
        open={isFormOpen}
        onOpenChange={(open) => !saving && setIsFormOpen(open)}
        title={isEdit ? t("admin.lessons.form.editTitle") : t("admin.lessons.create")}
        description={t("admin.lessons.form.description")}
        onSubmit={handleSubmit}
        submitLabel={isEdit ? t("common:actions.save") : t("admin.lessons.form.submitCreate")}
        submitting={saving}
        size="xl"
        steps={[
          {
            title: t("admin.lessons.form.stepPresentation"),
            validate: validatePresentation,
            content: (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {!isEdit && (
                    <FormField
                      label={t("admin.shared.module")}
                      htmlFor="lesson-module"
                      required
                      error={checked.presentation ? errors.moduleId : null}
                    >
                      <Select value={form.moduleId} onValueChange={(value) => setForm({ ...form, moduleId: value })}>
                        <SelectTrigger id="lesson-module">
                          <SelectValue placeholder={t("admin.shared.chooseModule")} />
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
                    <FormField
                      label={t("admin.shared.title")}
                      htmlFor="lesson-title"
                      required
                      error={checked.presentation ? errors.title : null}
                    >
                      <Input
                        id="lesson-title"
                        placeholder={t("admin.lessons.form.titlePlaceholder")}
                        value={form.title}
                        onChange={(event) => setForm({ ...form, title: event.target.value })}
                        aria-invalid={checked.presentation && !!errors.title}
                      />
                    </FormField>
                  </div>
                </div>

                <FormField
                  label={t("common:labels.description")}
                  htmlFor="lesson-description"
                  hint={t("admin.lessons.form.descriptionHint")}
                >
                  <Textarea
                    id="lesson-description"
                    placeholder={t("admin.lessons.form.descriptionPlaceholder")}
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    rows={2}
                  />
                </FormField>

                <FormField
                  label={t("admin.lessons.columns.video")}
                  htmlFor="lesson-video"
                  error={checked.presentation ? errors.videoUrl : null}
                  hint={t("admin.lessons.form.videoHint")}
                >
                  <Input
                    id="lesson-video"
                    type="url"
                    inputMode="url"
                    placeholder="https://www.youtube.com/watch?v=…"
                    value={form.videoUrl}
                    onChange={(event) => setForm({ ...form, videoUrl: event.target.value })}
                    aria-invalid={checked.presentation && !!errors.videoUrl}
                  />
                </FormField>
              </>
            ),
          },
          {
            title: t("admin.lessons.form.stepContent"),
            validate: validateContent,
            content: (
              <FormField label={t("admin.lessons.form.stepContent")} required error={checked.content ? errors.content : null}>
                {/* The editor grows with the text: only the panel scrolls. */}
                <WysiwygEditor
                  value={form.content}
                  onChange={(content) => setForm((previous) => ({ ...previous, content }))}
                  placeholder={t("admin.lessons.form.contentPlaceholder")}
                />
              </FormField>
            ),
          },
          {
            title: t("admin.lessons.form.stepResources"),
            content: (
              <FormField
                label={t("admin.lessons.columns.attachments")}
                hint={t("admin.lessons.form.attachmentsHint")}
              >
                <AttachmentsInput
                  className=""
                  value={form.attachments}
                  onChange={(attachments) => setForm((previous) => ({ ...previous, attachments }))}
                />
              </FormField>
            ),
          },
        ]}
      />

      <ConfirmDeleteDialog
        open={lessonToDelete !== null}
        onOpenChange={(open) => !open && setLessonToDelete(null)}
        title={t("admin.lessons.deleteConfirm.title")}
        description={t("admin.lessons.deleteConfirm.description", { title: lessonToDelete?.title ?? "" })}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
