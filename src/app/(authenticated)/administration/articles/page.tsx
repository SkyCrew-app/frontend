'use client'

import React, { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { format } from 'date-fns'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import { Extension } from '@tiptap/core'
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bold, Italic, UnderlineIcon, List, ListOrdered, Type } from 'lucide-react'
import { MultiSelect } from '@/components/ui/multiSlect'
import { GET_ARTICLES, CREATE_ARTICLE, UPDATE_ARTICLE, DELETE_ARTICLE } from '@/graphql/articles'

interface Article {
  id: string
  title: string
  description: string
  text: string
  tags: string[]
  createdAt: string
  eventDate: string | null
  photo: string | null
  documents: string | null
}

const TAGS = [
  'Actualités',
  'Événements',
  'Formation',
  'Réglementation',
  'Sécurité',
  'Technique',
  'Information'
]

const MenuButton = ({ onClick, isActive, icon }: { onClick: () => void, isActive: boolean, icon: React.ReactNode }) => (
  <Button
    type="button"
    variant={isActive ? "secondary" : "ghost"}
    size="icon"
    onClick={onClick}
  >
    {icon}
  </Button>
)

const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

const RichTextEditor = ({ content, onChange }: { content: string, onChange: (content: string) => void }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      BulletList,
      OrderedList,
      ListItem,
      FontSize,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose max-w-full p-4 focus:outline-none',
      },
    }
  })

  if (!editor) {
    return null
  }

  const fontSizes = [
    { value: '12px', label: 'Très petit' },
    { value: '14px', label: 'Petit' },
    { value: '16px', label: 'Normal' },
    { value: '18px', label: 'Grand' },
    { value: '20px', label: 'Très grand' },
    { value: '24px', label: 'Énorme' },
  ]

  const setFontSize = (size: string) => {
    editor.chain().focus().setFontSize(size).run();
  };

  return (
    <div className="border rounded-md">
      <div className="flex flex-wrap gap-2 p-2 border-b">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          icon={<Bold className="h-4 w-4" />}
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          icon={<Italic className="h-4 w-4" />}
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          icon={<UnderlineIcon className="h-4 w-4" />}
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          icon={<List className="h-4 w-4" />}
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          icon={<ListOrdered className="h-4 w-4" />}
        />
        <Select onValueChange={setFontSize}>
          <SelectTrigger className="w-[180px]">
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
        className="overflow-y-auto"
        style={{ height: '300px' }}
      />
    </div>
  )
}

export default function ArticlesAdminPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    text: '',
    eventDate: null as Date | null,
    photo: null as File | null,
    documents: null as File | null
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
    const variables = {
      title: formData.title,
      description: formData.description,
      text: formData.text,
      tags: formData.tags.split(',').map((tag: string) => tag.trim()),
      eventDate: formData.eventDate?.toISOString(),
      photo: selectedImage,
      documents: selectedDocument
    }

    try {
      if (isEditing) {
        await updateArticle({ variables: { id: selectedArticle?.id, ...variables } })
        toast({ title: 'Article mis à jour avec succès.' })
      } else {
        await createArticle({ variables })
        toast({ title: 'Article créé avec succès.' })
      }
      setIsDialogOpen(false)
      refetch()
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' })
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedDocument(file);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteArticle({ variables: { id } })
      toast({ title: 'Article supprimé avec succès.' })
      refetch()
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' })
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />
  if (error) {
    toast({ title: 'Erreur', description: "Impossible de charger les articles.", variant: 'destructive' })
    return null
  }

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <>
        <div className="flex flex-col items-center justify-center p-3 dark:text-white overflow-hidden">
          <h1 className="text-3xl font-bold mb-8">Gestion des articles</h1>
        </div>
        <div className="flex justify-between items-center mb-6">
          <Input
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={() => {
            setIsEditing(false)
            setFormData({ title: '', description: '', tags: '', text: '', eventDate: null, photo: null, documents: null })
            setIsDialogOpen(true)
          }}>
            Ajouter un Article
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Date de création</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredArticles.map((article) => (
              <TableRow key={article.id}>
                <TableCell>{article.title}</TableCell>
                <TableCell>{article.tags.join(', ')}</TableCell>
                <TableCell>{format(new Date(article.createdAt), 'dd/MM/yyyy')}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    className='mr-2'
                    onClick={() => {
                      setSelectedArticle(article)
                      setFormData({
                        title: article.title,
                        description: article.description,
                        tags: article.tags.join(', '),
                        text: article.text,
                        eventDate: article.eventDate ? new Date(article.eventDate) : null,
                        photo: null,
                        documents: null
                      })
                      setIsEditing(true)
                      setIsDialogOpen(true)
                    }}
                  >
                    Modifier
                  </Button>
                  <Button variant="destructive" onClick={() => handleDelete(article.id)}>
                    Supprimer
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Modifier l'Article" : 'Créer un Nouvel Article'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden">
            <Tabs defaultValue="info" className="flex-grow flex flex-col">
              <TabsList>
                <TabsTrigger value="info">Informations</TabsTrigger>
                <TabsTrigger value="content">Contenu</TabsTrigger>
                <TabsTrigger value="media">Médias</TabsTrigger>
              </TabsList>
              <div className="flex-grow overflow-y-auto">
                <TabsContent value="info" className="p-4 space-y-4">
                  <div>
                    <Label htmlFor="title">Titre</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tags">Tags</Label>
                    <MultiSelect
                      options={TAGS.map((tag) => ({ label: tag, value: tag }))}
                      selectedOptions={formData.tags.split(',').map((tag) => ({ label: tag, value: tag }))}
                      onChange={(tags) => setFormData({ ...formData, tags: tags.map((tag) => tag.value).join(', ') })}
                  />
                  </div>
                </TabsContent>
                <TabsContent value="content" className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="text">Texte</Label>
                    <RichTextEditor
                      content={formData.text}
                      onChange={(content) => setFormData({ ...formData, text: content })}
                    />
                  </div>
                  <div>
                    <Label>Date d'Événement</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Input
                          value={formData.eventDate ? format(formData.eventDate, 'dd/MM/yyyy') : 'Choisir une date'} readOnly />
                          </PopoverTrigger>
                          <PopoverContent>
                            <Calendar
                              mode="single"
                              selected={formData.eventDate || undefined}
                              onSelect={(date) => setFormData({ ...formData, eventDate: date || null })}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                </TabsContent>
                <TabsContent value="media" className="p-4 space-y-4">
                  <div>
                    <Label htmlFor="photo">Photo</Label>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    <Label htmlFor="document">Documents</Label>
                    <Input
                      id="document"
                      type="file"
                      accept=".pdf"
                      onChange={handleDocumentChange}
                    />
                  </div>
                </TabsContent>
              </div>
                </Tabs>
                <DialogFooter>
                  <Button type="submit">{isEditing ? 'Enregistrer' : 'Créer'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </>
)}