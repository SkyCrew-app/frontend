"use client"

import React, { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TextStyle from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import BulletList from "@tiptap/extension-bullet-list"
import OrderedList from "@tiptap/extension-ordered-list"
import ListItem from "@tiptap/extension-list-item"
import { motion, AnimatePresence } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Bold,
  Italic,
  UnderlineIcon,
  List,
  ListOrdered,
  Type,
  CalendarIcon,
  Search,
  PlusCircle,
  Edit,
  Trash2,
  Image,
  FileText,
  Tag,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Unlink,
  Loader2,
} from "lucide-react"
import { GET_ARTICLES, CREATE_ARTICLE, UPDATE_ARTICLE, DELETE_ARTICLE } from "@/graphql/articles"
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
  documents_url: string[] | null
}

const TAGS = ["Actualités", "Événements", "Formation", "Réglementation", "Sécurité", "Technique", "Information"]

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const MenuButton = ({
  onClick,
  isActive,
  icon,
  label,
}: { onClick: () => void; isActive: boolean; icon: React.ReactNode; label: string }) => (
  <Button
    type="button"
    variant={isActive ? "secondary" : "ghost"}
    size="sm"
    onClick={onClick}
    className="flex items-center gap-1 h-8"
    title={label}
  >
    {icon}
    <span className="hidden md:inline text-xs">{label}</span>
  </Button>
)

const RichTextEditor = ({ content, onChange }: { content: string; onChange: (content: string) => void }) => {
  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyle, Color, BulletList, OrderedList, ListItem, FontSize],
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
    return null
  }

  const fontSizes = [
    { value: "12px", label: "Très petit" },
    { value: "14px", label: "Petit" },
    { value: "16px", label: "Normal" },
    { value: "18px", label: "Grand" },
    { value: "20px", label: "Très grand" },
    { value: "24px", label: "Énorme" },
  ]

  const setFontSize = (size: string) => {
    editor.chain().focus().setFontSize(size).run()
  }

  // Fonction pour ajouter un lien
  const addLink = () => {
    const url = window.prompt("URL:")
    if (url) {
      // Sélectionner le texte actuel et le remplacer par un lien
      const { from, to } = editor.state.selection
      const text = editor.state.doc.textBetween(from, to, "")

      if (text) {
        // Si du texte est sélectionné, on le remplace par un lien
        editor.chain().focus().deleteSelection().insertContent(`<a href="${url}" target="_blank">${text}</a>`).run()
      } else {
        // Si aucun texte n'est sélectionné, on insère un nouveau lien
        editor.chain().focus().insertContent(`<a href="${url}" target="_blank">${url}</a>`).run()
      }
    }
  }

  // Fonction pour supprimer un lien
  const removeLink = () => {
    // Sélectionner le lien actuel et le remplacer par son texte
    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to, "")

    editor.chain().focus().deleteSelection().insertContent(text).run()
  }

  return (
    <div className="border rounded-md overflow-hidden shadow-sm">
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/50">
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
        <div className="h-6 w-px bg-border mx-1"></div>
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          icon={<List className="h-4 w-4" />}
          label="Liste"
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          icon={<ListOrdered className="h-4 w-4" />}
          label="Liste numérotée"
        />
        <div className="h-6 w-px bg-border mx-1"></div>
        {/* Remplaçons les boutons d'alignement par des alternatives */}
        <MenuButton
          onClick={() => {
            // Appliquer une classe CSS pour l'alignement à gauche
            editor.chain().focus().run()
            // Insérer un div avec style text-align: left
            document.execCommand("justifyLeft")
          }}
          isActive={false}
          icon={<AlignLeft className="h-4 w-4" />}
          label="Gauche"
        />
        <MenuButton
          onClick={() => {
            // Appliquer une classe CSS pour l'alignement au centre
            editor.chain().focus().run()
            // Insérer un div avec style text-align: center
            document.execCommand("justifyCenter")
          }}
          isActive={false}
          icon={<AlignCenter className="h-4 w-4" />}
          label="Centre"
        />
        <MenuButton
          onClick={() => {
            // Appliquer une classe CSS pour l'alignement à droite
            editor.chain().focus().run()
            // Insérer un div avec style text-align: right
            document.execCommand("justifyRight")
          }}
          isActive={false}
          icon={<AlignRight className="h-4 w-4" />}
          label="Droite"
        />
        <div className="h-6 w-px bg-border mx-1"></div>
        <MenuButton onClick={addLink} isActive={false} icon={<Link className="h-4 w-4" />} label="Lien" />
        <MenuButton
          onClick={removeLink}
          isActive={false}
          icon={<Unlink className="h-4 w-4" />}
          label="Supprimer lien"
        />
        <div className="h-6 w-px bg-border mx-1"></div>
        <Select onValueChange={setFontSize}>
          <SelectTrigger className="w-[140px] h-8">
            <Type className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Taille du texte" />
          </SelectTrigger>
          <SelectContent>
            {fontSizes.map((size) => (
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
      />
    </div>
  )
}

export default function ArticlesAdminPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tags: "",
    text: "",
    eventDate: null as Date | null,
    photo: null as File | null,
    documents: null as File | null,
  })

  const { toast } = useToast()
  const { data, loading, error, refetch } = useQuery(GET_ARTICLES)
  const [createArticle] = useMutation(CREATE_ARTICLE)
  const [updateArticle] = useMutation(UPDATE_ARTICLE)
  const [deleteArticle] = useMutation(DELETE_ARTICLE)

  React.useEffect(() => {
    if (data?.articles) setArticles(data.articles)
  }, [data])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const variables = {
      title: formData.title,
      description: formData.description,
      text: formData.text,
      tags: formData.tags
        .split(",")
        .filter((tag) => tag.trim())
        .map((tag: string) => tag.trim()),
      eventDate: formData.eventDate?.toISOString(),
      photo: selectedImage,
      documents: selectedDocument ? [selectedDocument] : [],
    }

    try {
      if (isEditing && selectedArticle) {
        await updateArticle({ variables: { id: selectedArticle.id, ...variables } })
        toast({
          title: "Article mis à jour avec succès.",
          description: `L'article "${formData.title}" a été mis à jour.`,
        })
      } else {
        await createArticle({ variables })
        toast({
          title: "Article créé avec succès.",
          description: `L'article "${formData.title}" a été créé.`,
        })
      }
      setIsDialogOpen(false)
      refetch()
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
    }
  }

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedDocument(file)
    }
  }

  const confirmDelete = (id: string) => {
    setArticleToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!articleToDelete) return

    try {
      await deleteArticle({ variables: { id: articleToDelete } })
      toast({
        title: "Article supprimé avec succès.",
        description: "L'article a été définitivement supprimé.",
      })
      setIsDeleteDialogOpen(false)
      refetch()
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const filteredArticles = articles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="container mx-auto p-6 space-y-8"
    >
      <motion.div variants={fadeIn} className="space-y-2">
        <h1 className="text-3xl font-bold">Gestion des Articles</h1>
        <p className="text-muted-foreground">Créez, modifiez et gérez les articles publiés sur le site de l'aéroclub</p>
      </motion.div>

      <motion.div
        variants={fadeIn}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full md:w-[300px]"
          />
        </div>
        <Button
          onClick={() => {
            setIsEditing(false)
            setFormData({
              title: "",
              description: "",
              tags: "",
              text: "",
              eventDate: null,
              photo: null,
              documents: null,
            })
            setSelectedImage(null)
            setSelectedDocument(null)
            setIsDialogOpen(true)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un Article
        </Button>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>Impossible de charger les articles. Veuillez réessayer plus tard.</AlertDescription>
        </Alert>
      ) : filteredArticles.length === 0 ? (
        <motion.div variants={fadeIn} className="text-center py-12">
          <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Aucun article trouvé</h3>
          <p className="text-muted-foreground mt-1">
            {searchTerm ? "Aucun article ne correspond à votre recherche." : "Commencez par créer un nouvel article."}
          </p>
          {searchTerm && (
            <Button variant="outline" className="mt-4" onClick={() => setSearchTerm("")}>
              Effacer la recherche
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredArticles.map((article) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                  {article.photo_url && (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img
                        src={article.photo_url || "/placeholder.svg"}
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {article.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <CardTitle className="line-clamp-2">{article.title}</CardTitle>
                    <CardDescription className="flex items-center text-xs">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {format(new Date(article.createdAt), "PPP", { locale: fr })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2 flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">{article.description}</p>
                  </CardContent>
                  <CardContent className="pt-0 pb-4 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedArticle(article)
                        setFormData({
                          title: article.title,
                          description: article.description,
                          tags: article.tags.join(", "),
                          text: article.text,
                          eventDate: article.eventDate ? new Date(article.eventDate) : null,
                          photo: null,
                          documents: null,
                        })
                        setIsEditing(true)
                        setIsDialogOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Modifier
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => confirmDelete(article.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Supprimer
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-xl">
              {isEditing ? "Modifier l'Article" : "Créer un Nouvel Article"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
            <Tabs defaultValue="info" className="flex flex-col flex-grow overflow-hidden">
              <TabsList className="grid w-full grid-cols-3 px-6">
                <TabsTrigger value="info" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Informations</span>
                </TabsTrigger>
                <TabsTrigger value="content" className="flex items-center gap-2">
                  <AlignLeft className="h-4 w-4" />
                  <span>Contenu</span>
                </TabsTrigger>
                <TabsTrigger value="media" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  <span>Médias</span>
                </TabsTrigger>
              </TabsList>
              <div className="flex-grow overflow-hidden">
                <TabsContent value="info" className="h-full overflow-y-auto p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium flex items-center">
                      Titre <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="Titre de l'article"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium flex items-center">
                      Description <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                      placeholder="Brève description de l'article"
                      className="w-full resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags" className="text-sm font-medium flex items-center">
                      <Tag className="h-4 w-4 mr-1" />
                      Tags
                    </Label>
                    <Select
                      onValueChange={(value) => {
                        const currentTags = formData.tags
                          .split(",")
                          .filter((tag) => tag.trim())
                          .map((tag) => tag.trim())

                        if (!currentTags.includes(value)) {
                          const newTags = [...currentTags, value].join(", ")
                          setFormData({ ...formData, tags: newTags })
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionnez des tags" />
                      </SelectTrigger>
                      <SelectContent>
                        {TAGS.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Afficher les tags sélectionnés */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.tags
                        .split(",")
                        .filter((tag) => tag.trim())
                        .map((tag, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {tag.trim()}
                            <button
                              type="button"
                              onClick={() => {
                                const newTags = formData.tags
                                  .split(",")
                                  .filter((t) => t.trim() !== tag.trim())
                                  .join(", ")
                                setFormData({ ...formData, tags: newTags })
                              }}
                              className="ml-1 rounded-full hover:bg-muted p-0.5"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                              <span className="sr-only">Supprimer</span>
                            </button>
                          </Badge>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Les tags aident à catégoriser et à retrouver facilement les articles.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Date d'Événement
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.eventDate
                            ? format(formData.eventDate, "PPP", { locale: fr })
                            : "Sélectionner une date (optionnel)"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.eventDate || undefined}
                          onSelect={(date) => setFormData({ ...formData, eventDate: date || null })}
                          initialFocus
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Optionnel. Utilisez ce champ si l'article concerne un événement à une date spécifique.
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="content" className="h-full overflow-y-auto p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="text" className="text-sm font-medium flex items-center">
                      Contenu de l'article <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <RichTextEditor
                      content={formData.text}
                      onChange={(content) => setFormData({ ...formData, text: content })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Utilisez l'éditeur pour formater votre texte, ajouter des listes, des liens, etc.
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="media" className="h-full overflow-y-auto p-6 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="photo" className="text-sm font-medium flex items-center">
                      <Image className="h-4 w-4 mr-1" />
                      Image principale
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Input
                          id="photo"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Format recommandé: JPG ou PNG, max 2MB</p>
                      </div>
                      <div className="flex items-center justify-center border rounded-md p-2 bg-muted/30 h-[100px]">
                        {selectedImage ? (
                          <div className="text-sm text-center">
                            <p className="font-medium">{selectedImage.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        ) : isEditing && selectedArticle?.photo_url ? (
                          <div className="text-sm text-center">
                            <p className="font-medium">Image existante</p>
                            <p className="text-xs text-muted-foreground">
                              Laissez vide pour conserver l'image actuelle
                            </p>
                          </div>
                        ) : (
                          <div className="text-sm text-center text-muted-foreground">
                            <Image className="h-8 w-8 mx-auto mb-1 opacity-50" />
                            <p>Aucune image sélectionnée</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document" className="text-sm font-medium flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      Documents complémentaires
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Input
                          id="document"
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                          onChange={handleDocumentChange}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Formats acceptés: PDF, Word, Excel, PowerPoint
                        </p>
                      </div>
                      <div className="flex items-center justify-center border rounded-md p-2 bg-muted/30 h-[100px]">
                        {selectedDocument ? (
                          <div className="text-sm text-center">
                            <p className="font-medium">{selectedDocument.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedDocument.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        ) : isEditing && selectedArticle?.documents_url?.length ? (
                          <div className="text-sm text-center">
                            <p className="font-medium">
                              Documents existants ({selectedArticle?.documents_url?.length})
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Laissez vide pour conserver les documents actuels
                            </p>
                          </div>
                        ) : (
                          <div className="text-sm text-center text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-1 opacity-50" />
                            <p>Aucun document sélectionné</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
            <DialogFooter className="px-6 py-4 border-t mt-auto">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? "Enregistrement..." : "Création..."}
                  </>
                ) : (
                  <>{isEditing ? "Enregistrer les modifications" : "Créer l'article"}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer cet article ? Cette action est irréversible.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
