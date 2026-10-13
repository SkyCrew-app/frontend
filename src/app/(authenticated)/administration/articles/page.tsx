"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery, useMutation } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import {
  Bold,
  CalendarIcon,
  FileText,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Newspaper,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
  UnderlineIcon,
  Unlink,
  X,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { SidePanel } from "@/components/layout/SidePanel"
import { articleTagLabel } from "@/components/articles/article-card"
import { ArticleImage } from "@/components/articles/article-image"
import { useToast } from "@/components/hooks/use-toast"
import { GET_ARTICLES, CREATE_ARTICLE, UPDATE_ARTICLE, DELETE_ARTICLE } from "@/graphql/articles"
import { formatDate } from "@/lib/format"
import i18n, { currentLocale, dateFnsLocale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import FontSize from "./setFontSize"

interface Article {
  id: string
  title: string
  description: string
  text: string
  tags: string[]
  createdAt: string
  eventDate: string | null
  photo_url: string | null
  documents_url?: string[] | null
}

interface ArticleFormData {
  title: string
  description: string
  tags: string
  text: string
  eventDate: Date | null
}

interface FormErrors {
  title?: string
  description?: string
  text?: string
}

// Stored as they are by the API; shown through articleTagLabel.
const TAGS = ["Actualités", "Événements", "Formation", "Réglementation", "Sécurité", "Technique", "Information"]

const EMPTY_FORM: ArticleFormData = { title: "", description: "", tags: "", text: "", eventDate: null }

const FONT_SIZES = [
  { value: "12px", key: "xs" },
  { value: "14px", key: "sm" },
  { value: "16px", key: "md" },
  { value: "18px", key: "lg" },
  { value: "20px", key: "xl" },
  { value: "24px", key: "xxl" },
]

const parseTags = (tags: string) =>
  tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)

// Empty once the markup is set aside: "<p></p>" has no text.
const isEmptyHtml = (html: string) =>
  (new DOMParser().parseFromString(html, "text/html").body.textContent ?? "").trim() === ""

const formatFileSize = (bytes: number) =>
  i18n.t("articles:admin.files.size", {
    size: new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: 2 }).format(bytes / 1024 / 1024),
  })

const RequiredMark = () => (
  <span className="text-destructive" aria-hidden="true">
    {" "}
    *
  </span>
)

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null

const MenuButton = ({
  onClick,
  isActive,
  icon,
  label,
  disabled,
}: {
  onClick: () => void
  isActive: boolean
  icon: React.ReactNode
  label: string
  disabled?: boolean
}) => (
  <Button
    type="button"
    variant={isActive ? "secondary" : "ghost"}
    size="icon"
    onClick={onClick}
    disabled={disabled}
    className="h-9 w-9"
    aria-label={label}
    aria-pressed={isActive}
    title={label}
  >
    {icon}
  </Button>
)

const ToolbarSeparator = () => <div className="mx-1 h-6 w-px bg-border" aria-hidden="true" />

const RichTextEditor = ({
  content,
  onChange,
  invalid,
  labelledBy,
  describedBy,
}: {
  content: string
  onChange: (content: string) => void
  invalid?: boolean
  labelledBy?: string
  describedBy?: string
}) => {
  const { t } = useTranslation("articles")
  const [isLinkOpen, setIsLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")

  const editor = useEditor({
    // Rendered in the browser only: the page is also rendered on the server.
    immediatelyRender: false,
    // The toolbar shows what is active at the cursor.
    shouldRerenderOnTransaction: true,
    // The starter kit includes lists, underline and links.
    extensions: [StarterKit, TextStyle, Color, FontSize],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose max-w-full p-4 focus:outline-none min-h-[200px] dark:prose-invert",
      },
    },
  })

  if (!editor) {
    return <Skeleton className="h-[300px] w-full" />
  }

  const setFontSize = (size: string) => {
    editor.chain().focus().setFontSize(size).run()
  }

  const isLinkActive = editor.isActive("link")

  const openLinkPopover = (open: boolean) => {
    if (open) setLinkUrl(editor.getAttributes("link").href ?? "")
    setIsLinkOpen(open)
  }

  const applyLink = () => {
    const value = linkUrl.trim()
    if (!value) return
    const href = /^(https?:\/\/|mailto:|tel:|\/)/i.test(value) ? value : `https://${value}`

    if (editor.state.selection.empty && !isLinkActive) {
      // Nothing selected: the address itself becomes the link text.
      editor
        .chain()
        .focus()
        .insertContent({ type: "text", text: value, marks: [{ type: "link", attrs: { href } }] })
        .run()
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run()
    }
    setIsLinkOpen(false)
  }

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run()
  }

  return (
    <div className={cn("overflow-hidden rounded-md border", invalid && "border-destructive")}>
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/50 p-2" role="toolbar" aria-label={t("admin.editor.toolbar")}>
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          icon={<Bold className="h-4 w-4" />}
          label={t("common:editor.bold")}
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          icon={<Italic className="h-4 w-4" />}
          label={t("common:editor.italic")}
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          icon={<UnderlineIcon className="h-4 w-4" />}
          label={t("admin.editor.underline")}
        />
        <ToolbarSeparator />
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          icon={<List className="h-4 w-4" />}
          label={t("common:editor.bulletList")}
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          icon={<ListOrdered className="h-4 w-4" />}
          label={t("common:editor.orderedList")}
        />
        <ToolbarSeparator />
        <Popover open={isLinkOpen} onOpenChange={openLinkPopover}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={isLinkActive ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9"
              aria-label={isLinkActive ? t("admin.editor.editLink") : t("admin.editor.addLink")}
              aria-pressed={isLinkActive}
              title={isLinkActive ? t("admin.editor.editLink") : t("admin.editor.addLink")}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="editor-link-url">{t("admin.editor.linkUrl")}</Label>
              <Input
                id="editor-link-url"
                type="url"
                inputMode="url"
                placeholder={t("admin.editor.linkPlaceholder")}
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  // Enter must set the link, not submit the article form around the editor.
                  if (e.key === "Enter") {
                    e.preventDefault()
                    applyLink()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsLinkOpen(false)}>
                {t("common:actions.cancel")}
              </Button>
              <Button type="button" size="sm" onClick={applyLink} disabled={!linkUrl.trim()}>
                {t("common:actions.apply")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <MenuButton
          onClick={removeLink}
          isActive={false}
          disabled={!isLinkActive}
          icon={<Unlink className="h-4 w-4" />}
          label={t("admin.editor.removeLink")}
        />
        <ToolbarSeparator />
        <Select onValueChange={setFontSize}>
          <SelectTrigger className="h-9 w-[150px]" aria-label={t("admin.editor.fontSizeLabel")}>
            <SelectValue placeholder={t("admin.editor.fontSizeLabel")} />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {t(`admin.editor.fontSize.${size.key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <EditorContent
        editor={editor}
        className="overflow-y-auto bg-background"
        style={{ minHeight: "250px", maxHeight: "400px" }}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
      />
    </div>
  )
}

export default function ArticlesAdminPage() {
  const { t } = useTranslation("articles")
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEventDateOpen, setIsEventDateOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null)
  // Bumped to empty a file input, which cannot be cleared through its value.
  const [fileInputKey, setFileInputKey] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<ArticleFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  const { toast } = useToast()
  const { data, loading, error, refetch } = useQuery(GET_ARTICLES)
  const [createArticle] = useMutation(CREATE_ARTICLE)
  const [updateArticle] = useMutation(UPDATE_ARTICLE)
  const [deleteArticle] = useMutation(DELETE_ARTICLE)

  const articles: Article[] = useMemo(() => data?.articles ?? [], [data])

  const openCreate = () => {
    setIsEditing(false)
    setSelectedArticle(null)
    setFormData(EMPTY_FORM)
    setErrors({})
    setSelectedImage(null)
    setSelectedDocument(null)
    setIsDialogOpen(true)
  }

  const openEdit = (article: Article) => {
    setIsEditing(true)
    setSelectedArticle(article)
    setFormData({
      title: article.title,
      description: article.description,
      tags: (article.tags ?? []).join(", "),
      text: article.text,
      eventDate: article.eventDate ? new Date(article.eventDate) : null,
    })
    setErrors({})
    // Files picked for another article must not follow into this one.
    setSelectedImage(null)
    setSelectedDocument(null)
    setIsDialogOpen(true)
  }

  const validate = (): FormErrors => {
    const next: FormErrors = {}
    if (!formData.title.trim()) next.title = t("admin.form.errors.title")
    if (!formData.description.trim()) next.description = t("admin.form.errors.summary")
    if (isEmptyHtml(formData.text)) next.text = t("admin.form.errors.content")
    return next
  }

  // Checks the fields of one step and shows their errors; the other fields keep their state.
  const validateStep = (fields: (keyof FormErrors)[]) => {
    const all = validate()
    const stepErrors = Object.fromEntries(fields.map((field) => [field, all[field]]))
    setErrors((current) => ({ ...current, ...stepErrors }))
    return fields.every((field) => !all[field])
  }

  const handleSubmit = async () => {
    if (isSubmitting) return

    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)

    const variables = {
      title: formData.title,
      description: formData.description,
      text: formData.text,
      tags: parseTags(formData.tags),
      eventDate: formData.eventDate?.toISOString(),
      photo: selectedImage,
      documents: selectedDocument ? [selectedDocument] : [],
    }

    try {
      if (isEditing && selectedArticle) {
        // Files are only sent when a new one was picked, so the existing ones are kept otherwise.
        await updateArticle({
          variables: {
            id: selectedArticle.id,
            title: variables.title,
            description: variables.description,
            text: variables.text,
            tags: variables.tags,
            eventDate: variables.eventDate,
            ...(selectedImage && { photo: selectedImage }),
            ...(selectedDocument && { documents: [selectedDocument] }),
          },
        })
        toast({
          title: t("admin.toast.updated.title"),
          description: t("admin.toast.updated.description", { title: formData.title }),
        })
      } else {
        await createArticle({ variables })
        toast({
          title: t("admin.toast.published.title"),
          description: t("admin.toast.published.description", { title: formData.title }),
        })
      }
      setIsDialogOpen(false)
      refetch()
    } catch {
      toast({
        title: isEditing ? t("admin.toast.saveFailed.title") : t("admin.toast.saveFailed.publishTitle"),
        description: t("admin.toast.saveFailed.description"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!articleToDelete || isDeleting) return

    setIsDeleting(true)
    try {
      await deleteArticle({ variables: { id: articleToDelete.id } })
      toast({
        title: t("admin.toast.deleted.title"),
        description: t("admin.toast.deleted.description", { title: articleToDelete.title }),
      })
      setIsDeleteOpen(false)
      refetch()
    } catch {
      toast({
        title: t("admin.toast.deleteFailed.title"),
        description: t("admin.toast.deleteFailed.description"),
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredArticles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return articles
    return articles.filter(
      (article) =>
        article.title.toLowerCase().includes(term) ||
        article.description.toLowerCase().includes(term) ||
        (article.tags ?? []).some(
          // The theme as stored, and as it is shown in the current language.
          (tag) => tag.toLowerCase().includes(term) || articleTagLabel(tag).toLowerCase().includes(term),
        ),
    )
  }, [articles, searchTerm])

  const formTags = parseTags(formData.tags)
  const availableTags = TAGS.filter((tag) => !formTags.includes(tag))

  const addTag = (tag: string) => {
    setFormData((current) => {
      const currentTags = parseTags(current.tags)
      return currentTags.includes(tag) ? current : { ...current, tags: [...currentTags, tag].join(", ") }
    })
  }

  const removeTag = (tag: string) => {
    setFormData((current) => ({
      ...current,
      tags: parseTags(current.tags)
        .filter((item) => item !== tag)
        .join(", "),
    }))
  }

  const existingDocuments = isEditing ? (selectedArticle?.documents_url?.length ?? 0) : 0

  const presentationStep = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">
          {t("admin.form.title")}
          <RequiredMark />
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => {
            const title = e.target.value
            setFormData((current) => ({ ...current, title }))
            if (errors.title) setErrors((current) => ({ ...current, title: undefined }))
          }}
          required
          placeholder={t("admin.form.titlePlaceholder")}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "title-error" : undefined}
        />
        <FieldError id="title-error" message={errors.title} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">
          {t("admin.form.summary")}
          <RequiredMark />
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => {
            const description = e.target.value
            setFormData((current) => ({ ...current, description }))
            if (errors.description) setErrors((current) => ({ ...current, description: undefined }))
          }}
          required
          placeholder={t("admin.form.summaryPlaceholder")}
          className="resize-none"
          rows={3}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "description-error" : undefined}
        />
        <FieldError id="description-error" message={errors.description} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tags">{t("shared.themes")}</Label>
          <Select value="" onValueChange={addTag} disabled={availableTags.length === 0}>
            <SelectTrigger id="tags">
              <SelectValue
                placeholder={availableTags.length === 0 ? t("admin.form.themesAllAdded") : t("admin.form.addTheme")}
              />
            </SelectTrigger>
            <SelectContent>
              {availableTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {articleTagLabel(tag)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formTags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {formTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {articleTagLabel(tag)}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="rounded-full p-0.5 hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t("shared.removeTheme", { tag: articleTagLabel(tag) })}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("admin.form.themesHint")}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-date">{t("admin.form.eventDate")}</Label>
          <div className="flex gap-2">
            <Popover open={isEventDateOpen} onOpenChange={setIsEventDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="event-date"
                  type="button"
                  variant="outline"
                  className={cn(
                    "min-w-0 flex-1 justify-start font-normal",
                    !formData.eventDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {formData.eventDate ? formatDate(formData.eventDate) : t("admin.form.noDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.eventDate ?? undefined}
                  onSelect={(date) => {
                    setFormData((current) => ({ ...current, eventDate: date ?? null }))
                    if (date) setIsEventDateOpen(false)
                  }}
                  initialFocus
                  locale={dateFnsLocale()}
                />
              </PopoverContent>
            </Popover>
            {formData.eventDate && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFormData((current) => ({ ...current, eventDate: null }))}
                aria-label={t("admin.form.removeEventDate")}
                title={t("admin.form.removeDate")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("admin.form.eventDateHint")}
          </p>
        </div>
      </div>
    </div>
  )

  const contentStep = (
    <div className="space-y-2">
      <p id="article-content-label" className="text-sm font-medium">
        {t("admin.form.content")}
        <RequiredMark />
      </p>
      <RichTextEditor
        content={formData.text}
        onChange={(text) => {
          setFormData((current) => ({ ...current, text }))
          setErrors((current) => (current.text ? { ...current, text: undefined } : current))
        }}
        invalid={Boolean(errors.text)}
        labelledBy="article-content-label"
        describedBy={errors.text ? "text-error" : undefined}
      />
      <FieldError id="text-error" message={errors.text} />
    </div>
  )

  const filesStep = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="photo">{t("admin.files.image")}</Label>
        <Input
          key={`photo-${fileInputKey}`}
          id="photo"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setSelectedImage(file)
          }}
          className="cursor-pointer"
        />
        <div className="flex items-center gap-3">
          <ArticleImage
            src={selectedImage ? null : isEditing ? selectedArticle?.photo_url : null}
            alt={t("admin.files.imagePreviewAlt")}
            className="aspect-video w-24 shrink-0 rounded-md"
            iconClassName="h-5 w-5"
          />
          <div className="min-w-0 text-xs text-muted-foreground">
            {selectedImage ? (
              <>
                <p className="truncate font-medium text-foreground">{selectedImage.name}</p>
                <p>{formatFileSize(selectedImage.size)}</p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => {
                    setSelectedImage(null)
                    setFileInputKey((key) => key + 1)
                  }}
                >
                  {t("admin.files.removeFile")}
                </Button>
              </>
            ) : isEditing && selectedArticle?.photo_url ? (
              <p>{t("admin.files.currentImage")}</p>
            ) : (
              <p>{t("admin.files.imageHint")}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="document">{t("admin.files.document")}</Label>
        <Input
          key={`document-${fileInputKey}`}
          id="document"
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setSelectedDocument(file)
          }}
          className="cursor-pointer"
        />
        <div className="flex items-center gap-3">
          <div
            className="flex aspect-video w-24 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
            aria-hidden="true"
          >
            <FileText className="h-5 w-5 opacity-60" />
          </div>
          <div className="min-w-0 text-xs text-muted-foreground">
            {selectedDocument ? (
              <>
                <p className="truncate font-medium text-foreground">{selectedDocument.name}</p>
                <p>{formatFileSize(selectedDocument.size)}</p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => {
                    setSelectedDocument(null)
                    setFileInputKey((key) => key + 1)
                  }}
                >
                  {t("admin.files.removeFile")}
                </Button>
              </>
            ) : existingDocuments > 0 ? (
              <p>{t("admin.files.existingDocuments", { count: existingDocuments })}</p>
            ) : (
              <p>{t("admin.files.documentHint")}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.title")}
        description={t("admin.description")}
        className="mb-0"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("admin.newArticle")}
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label={t("shared.searchLabel")}
            placeholder={t("admin.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {!loading && !error && articles.length > 0 && (
          <p className="text-sm text-muted-foreground sm:ml-auto">
            {filteredArticles.length === articles.length
              ? t("admin.count", { count: articles.length })
              : t("admin.filteredCount", { count: filteredArticles.length, total: articles.length })}
          </p>
        )}
      </div>

      {loading && !data ? (
        <Card role="status" aria-label={t("shared.loading")}>
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-12 w-20 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="hidden h-4 w-24 sm:block" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : articles.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title={t("shared.emptyTitle")}
          description={t("admin.emptyDescription")}
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("admin.newArticle")}
            </Button>
          }
        />
      ) : filteredArticles.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={t("shared.noMatchTitle")}
          description={t("admin.noMatchDescription")}
          action={
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              {t("shared.clearSearch")}
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.table.article")}</TableHead>
                  <TableHead>{t("shared.themes")}</TableHead>
                  <TableHead>{t("admin.table.publishedOn")}</TableHead>
                  <TableHead>{t("shared.event")}</TableHead>
                  <TableHead className="text-right">{t("common:labels.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      <div className="flex min-w-[16rem] items-center gap-3">
                        <ArticleImage
                          src={article.photo_url}
                          alt=""
                          className="aspect-video w-20 shrink-0 rounded-md"
                          iconClassName="h-5 w-5"
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/articles/${article.id}`}
                            className="line-clamp-1 font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                            title={t("admin.table.viewAsMember")}
                          >
                            {article.title}
                          </Link>
                          <p className="line-clamp-1 text-sm text-muted-foreground">{article.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {article.tags?.length ? (
                        <div className="flex min-w-[8rem] flex-wrap gap-1">
                          {article.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {articleTagLabel(tag)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{t("common:labels.missing")}</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(article.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(article.eventDate)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => openEdit(article)}
                          aria-label={t("admin.table.editLabel", { title: article.title })}
                          title={t("common:actions.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:text-destructive"
                          onClick={() => {
                            setArticleToDelete(article)
                            setIsDeleteOpen(true)
                          }}
                          aria-label={t("admin.table.deleteLabel", { title: article.title })}
                          title={t("common:actions.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <SidePanel
        open={isDialogOpen}
        onOpenChange={(open) => !isSubmitting && setIsDialogOpen(open)}
        title={isEditing ? t("admin.panel.editTitle") : t("admin.newArticle")}
        description={
          isEditing
            ? t("admin.panel.editDescription")
            : t("admin.panel.createDescription")
        }
        onSubmit={handleSubmit}
        submitLabel={isEditing ? t("common:actions.save") : t("admin.panel.publish")}
        submitting={isSubmitting}
        size="xl"
        steps={[
          {
            title: t("admin.panel.steps.presentation"),
            content: presentationStep,
            validate: () => validateStep(["title", "description"]),
          },
          { title: t("admin.panel.steps.content"), content: contentStep, validate: () => validateStep(["text"]) },
          {
            title: t("admin.panel.steps.files"),
            description: t("admin.panel.steps.filesDescription"),
            content: filesStep,
          },
        ]}
      />

      <AlertDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          // The article is kept in state so its title stays readable while the dialog closes.
          if (!open && !isDeleting) setIsDeleteOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.deleteDialog.description", { title: articleToDelete?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={isDeleting}
              onClick={(e) => {
                // Keep the dialog open until the server has answered.
                e.preventDefault()
                void handleDelete()
              }}
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("common:actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
