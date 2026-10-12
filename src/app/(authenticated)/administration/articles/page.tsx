"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery, useMutation } from "@apollo/client"
import { fr } from "date-fns/locale"
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
import { ArticleImage } from "@/components/articles/article-image"
import { useToast } from "@/components/hooks/use-toast"
import { GET_ARTICLES, CREATE_ARTICLE, UPDATE_ARTICLE, DELETE_ARTICLE } from "@/graphql/articles"
import { formatDate } from "@/lib/format"
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

const TAGS = ["Actualités", "Événements", "Formation", "Réglementation", "Sécurité", "Technique", "Information"]

const EMPTY_FORM: ArticleFormData = { title: "", description: "", tags: "", text: "", eventDate: null }

const FONT_SIZES = [
  { value: "12px", label: "Très petit" },
  { value: "14px", label: "Petit" },
  { value: "16px", label: "Normal" },
  { value: "18px", label: "Grand" },
  { value: "20px", label: "Très grand" },
  { value: "24px", label: "Énorme" },
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
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(bytes / 1024 / 1024)} Mo`

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
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/50 p-2" role="toolbar" aria-label="Mise en forme">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          icon={<Bold className="h-4 w-4" />}
          label="Gras"
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          icon={<Italic className="h-4 w-4" />}
          label="Italique"
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          icon={<UnderlineIcon className="h-4 w-4" />}
          label="Souligné"
        />
        <ToolbarSeparator />
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          icon={<List className="h-4 w-4" />}
          label="Liste à puces"
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          icon={<ListOrdered className="h-4 w-4" />}
          label="Liste numérotée"
        />
        <ToolbarSeparator />
        <Popover open={isLinkOpen} onOpenChange={openLinkPopover}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={isLinkActive ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9"
              aria-label={isLinkActive ? "Modifier le lien" : "Ajouter un lien"}
              aria-pressed={isLinkActive}
              title={isLinkActive ? "Modifier le lien" : "Ajouter un lien"}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="editor-link-url">Adresse du lien</Label>
              <Input
                id="editor-link-url"
                type="url"
                inputMode="url"
                placeholder="https://www.exemple.fr"
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
                Annuler
              </Button>
              <Button type="button" size="sm" onClick={applyLink} disabled={!linkUrl.trim()}>
                Appliquer
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <MenuButton
          onClick={removeLink}
          isActive={false}
          disabled={!isLinkActive}
          icon={<Unlink className="h-4 w-4" />}
          label="Retirer le lien"
        />
        <ToolbarSeparator />
        <Select onValueChange={setFontSize}>
          <SelectTrigger className="h-9 w-[150px]" aria-label="Taille du texte">
            <SelectValue placeholder="Taille du texte" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
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
    if (!formData.title.trim()) next.title = "Donnez un titre à l'article."
    if (!formData.description.trim()) next.description = "Ajoutez un résumé : il est affiché dans la liste des actualités."
    if (isEmptyHtml(formData.text)) next.text = "Rédigez le contenu de l'article."
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
          title: "Article mis à jour",
          description: `« ${formData.title} » a été enregistré.`,
        })
      } else {
        await createArticle({ variables })
        toast({
          title: "Article publié",
          description: `« ${formData.title} » est visible dans les actualités.`,
        })
      }
      setIsDialogOpen(false)
      refetch()
    } catch {
      toast({
        title: isEditing ? "Enregistrement impossible" : "Publication impossible",
        description: "L'article n'a pas pu être enregistré. Vérifiez les champs et les fichiers, puis réessayez.",
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
        title: "Article supprimé",
        description: `« ${articleToDelete.title} » a été supprimé.`,
      })
      setIsDeleteOpen(false)
      refetch()
    } catch {
      toast({
        title: "Suppression impossible",
        description: "L'article n'a pas pu être supprimé. Réessayez dans un instant.",
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
        (article.tags ?? []).some((tag) => tag.toLowerCase().includes(term)),
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
          Titre
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
          placeholder="Ex. : Journée portes ouvertes du 14 juin"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "title-error" : undefined}
        />
        <FieldError id="title-error" message={errors.title} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">
          Résumé
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
          placeholder="Une ou deux phrases affichées dans la liste des actualités"
          className="resize-none"
          rows={3}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "description-error" : undefined}
        />
        <FieldError id="description-error" message={errors.description} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tags">Thèmes</Label>
          <Select value="" onValueChange={addTag} disabled={availableTags.length === 0}>
            <SelectTrigger id="tags">
              <SelectValue
                placeholder={availableTags.length === 0 ? "Tous les thèmes sont ajoutés" : "Ajouter un thème"}
              />
            </SelectTrigger>
            <SelectContent>
              {availableTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formTags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {formTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="rounded-full p-0.5 hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Retirer le thème ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Les thèmes permettent aux membres de filtrer les actualités.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-date">Date de l'événement</Label>
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
                  {formData.eventDate ? formatDate(formData.eventDate) : "Aucune date"}
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
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
            {formData.eventDate && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFormData((current) => ({ ...current, eventDate: null }))}
                aria-label="Retirer la date de l'événement"
                title="Retirer la date"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Facultatif. À renseigner si l'article annonce un événement.
          </p>
        </div>
      </div>
    </div>
  )

  const contentStep = (
    <div className="space-y-2">
      <p id="article-content-label" className="text-sm font-medium">
        Contenu de l'article
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
        <Label htmlFor="photo">Image principale</Label>
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
            alt="Aperçu de l'image principale"
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
                  Retirer ce fichier
                </Button>
              </>
            ) : isEditing && selectedArticle?.photo_url ? (
              <p>Image actuelle. Choisissez un fichier pour la remplacer.</p>
            ) : (
              <p>JPG ou PNG, 2 Mo maximum conseillé.</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="document">Document joint</Label>
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
                  Retirer ce fichier
                </Button>
              </>
            ) : existingDocuments > 0 ? (
              <p>
                {existingDocuments} document{existingDocuments > 1 ? "s" : ""} déjà joint
                {existingDocuments > 1 ? "s" : ""}. Choisissez un fichier pour le
                {existingDocuments > 1 ? "s" : ""} remplacer.
              </p>
            ) : (
              <p>PDF, Word, Excel ou PowerPoint.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Articles"
        description="Rédigez et gérez les actualités visibles par les membres."
        className="mb-0"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvel article
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
            aria-label="Rechercher un article"
            placeholder="Rechercher par titre ou thème…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {!loading && !error && articles.length > 0 && (
          <p className="text-sm text-muted-foreground sm:ml-auto">
            {filteredArticles.length === articles.length
              ? `${articles.length} article${articles.length > 1 ? "s" : ""}`
              : `${filteredArticles.length} sur ${articles.length}`}
          </p>
        )}
      </div>

      {loading && !data ? (
        <Card role="status" aria-label="Chargement des articles">
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
          title="Aucun article pour le moment"
          description="Publiez une première actualité : elle apparaîtra sur le tableau de bord des membres."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouvel article
            </Button>
          }
        />
      ) : filteredArticles.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Aucun article ne correspond"
          description="Essayez un autre mot ou effacez la recherche."
          action={
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              Effacer la recherche
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead>Thèmes</TableHead>
                  <TableHead>Publié le</TableHead>
                  <TableHead>Événement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                            title="Voir l'article tel que les membres le lisent"
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
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
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
                          aria-label={`Modifier l'article « ${article.title} »`}
                          title="Modifier"
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
                          aria-label={`Supprimer l'article « ${article.title} »`}
                          title="Supprimer"
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
        title={isEditing ? "Modifier l'article" : "Nouvel article"}
        description={
          isEditing
            ? "Les modifications sont visibles par les membres dès l'enregistrement."
            : "L'article est visible par les membres dès sa publication."
        }
        onSubmit={handleSubmit}
        submitLabel={isEditing ? "Enregistrer" : "Publier l'article"}
        submitting={isSubmitting}
        size="xl"
        steps={[
          {
            title: "Présentation",
            content: presentationStep,
            validate: () => validateStep(["title", "description"]),
          },
          { title: "Contenu", content: contentStep, validate: () => validateStep(["text"]) },
          {
            title: "Illustration et pièces jointes",
            description: "Facultatif. L'image illustre l'article dans la liste des actualités.",
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
            <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'article « {articleToDelete?.title} » sera définitivement supprimé. Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
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
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
