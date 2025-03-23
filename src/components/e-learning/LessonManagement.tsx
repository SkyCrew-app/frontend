"use client"

import type React from "react"

import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import {
  GET_COURSES,
  GET_MODULES_BY_COURSE,
  GET_LESSONS_BY_MODULE,
  CREATE_LESSON,
  UPDATE_LESSON,
  DELETE_LESSON,
} from "@/graphql/learningAdmin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  PlusCircle,
  FileText,
  Edit,
  Trash2,
  BookOpen,
  Layers,
  Search,
  CheckCircle2,
  Info,
  Youtube,
  Paperclip,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "@/components/hooks/use-toast"
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor"
import { AttachmentsInput } from "@/components/ui/attachments-input"

export function LessonManagement() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [attachments, setAttachments] = useState<string[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [selectedModuleId, setSelectedModuleId] = useState("")
  const [editingLesson, setEditingLesson] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const { data: coursesData, loading: coursesLoading } = useQuery(GET_COURSES)
  const {
    data: modulesData,
    loading: modulesLoading,
    refetch: refetchModules,
  } = useQuery(GET_MODULES_BY_COURSE, {
    variables: { courseId: Number.parseInt(selectedCourseId) },
    skip: !selectedCourseId,
  })
  const {
    data: lessonsData,
    loading: lessonsLoading,
    error,
    refetch: refetchLessons,
  } = useQuery(GET_LESSONS_BY_MODULE, {
    variables: { moduleId: Number.parseInt(selectedModuleId) },
    skip: !selectedModuleId,
  })

  const [createLesson, { loading: createLoading }] = useMutation(CREATE_LESSON, {
    onCompleted: () => {
      refetchLessons()
      toast({
        title: "Leçon créée avec succès",
        description: "La leçon a été ajoutée au module sélectionné.",
        variant: "default",
      })
      resetForm()
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de la création",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const [updateLesson, { loading: updateLoading }] = useMutation(UPDATE_LESSON, {
    onCompleted: () => {
      refetchLessons()
      setIsEditDialogOpen(false)
      toast({
        title: "Leçon mise à jour",
        description: "Les modifications ont été enregistrées avec succès.",
        variant: "default",
      })
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de la mise à jour",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const [deleteLesson, { loading: deleteLoading }] = useMutation(DELETE_LESSON, {
    onCompleted: () => {
      refetchLessons()
      toast({
        title: "Leçon supprimée",
        description: "La leçon a été supprimée avec succès.",
        variant: "default",
      })
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de la suppression",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setContent("")
    setVideoUrl("")
    setAttachments([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createLesson({
        variables: {
          createLessonInput: {
            title,
            description,
            content,
            video_url: videoUrl,
            attachments,
            moduleId: Number.parseInt(selectedModuleId),
          },
        },
      })
    } catch (err) {
      console.error("Error creating lesson:", err)
    }
  }

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateLesson({
        variables: {
          updateLessonInput: {
            id: editingLesson.id,
            title: editingLesson.title,
            description: editingLesson.description,
            content: editingLesson.content,
            video_url: editingLesson.video_url,
            attachments: editingLesson.attachments,
            moduleId: Number.parseInt(editingLesson.moduleId),
          },
        },
      })
    } catch (err) {
      console.error("Error updating lesson:", err)
    }
  }

  const handleDeleteLesson = async (id: string) => {
    try {
      await deleteLesson({
        variables: { id: Number.parseInt(id) },
      })
    } catch (err) {
      console.error("Error deleting lesson:", err)
    }
  }

  const openEditDialog = (lesson: any) => {
    try {
      setEditingLesson({
        ...lesson,
        attachments: lesson.attachments || [],
      })
      setIsEditDialogOpen(true)
    } catch (error) {
      console.error("Error opening edit dialog:", error)
      toast({
        title: "Erreur",
        description: "Impossible de modifier cette leçon. Veuillez réessayer.",
        variant: "destructive",
      })
    }
  }

  // Filtrer les leçons
  const filteredLessons = lessonsData?.getLessonsByModule
    ? lessonsData.getLessonsByModule.filter((lesson: any) => {
        return (
          lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lesson.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
    : []

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <Tabs defaultValue="list" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="list" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Liste des leçons
        </TabsTrigger>
        <TabsTrigger value="create" className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Créer une leçon
        </TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              value={selectedCourseId}
              onValueChange={(value) => {
                setSelectedCourseId(value)
                setSelectedModuleId("")
                setSearchTerm("")
              }}
            >
              <SelectTrigger>
                <div className="flex items-center">
                  <BookOpen className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Sélectionner un cours" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {coursesLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <svg
                      className="animate-spin h-5 w-5 text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                ) : coursesData?.getCourses.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">Aucun cours disponible</div>
                ) : (
                  coursesData?.getCourses.map((course: any) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {selectedCourseId && (
              <Select
                value={selectedModuleId}
                onValueChange={setSelectedModuleId}
                disabled={!selectedCourseId || modulesLoading}
              >
                <SelectTrigger>
                  <div className="flex items-center">
                    <Layers className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Sélectionner un module" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {modulesLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <svg
                        className="animate-spin h-5 w-5 text-primary"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </div>
                  ) : !modulesData?.getModulesByCourse || modulesData.getModulesByCourse.length === 0 ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      Aucun module disponible pour ce cours
                    </div>
                  ) : (
                    modulesData.getModulesByCourse.map((module: any) => (
                      <SelectItem key={module.id} value={module.id.toString()}>
                        {module.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedModuleId && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une leçon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          )}
        </div>

        {!selectedCourseId ? (
          <Card className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Info className="h-5 w-5 mr-2" />
                Sélectionnez un cours et un module
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Veuillez sélectionner un cours puis un module pour voir ses leçons.</p>
            </CardContent>
          </Card>
        ) : !selectedModuleId ? (
          <Card className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Info className="h-5 w-5 mr-2" />
                Sélectionnez un module
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Veuillez sélectionner un module pour voir ses leçons.</p>
            </CardContent>
          </Card>
        ) : lessonsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="bg-red-50 border-red-200 text-red-800">
            <CardHeader>
              <CardTitle>Erreur de chargement</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error.message}</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => refetchLessons()}>
                Réessayer
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <>
            {filteredLessons.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                <h3 className="mt-4 text-lg font-medium">Aucune leçon trouvée</h3>
                <p className="text-muted-foreground mt-2">
                  {searchTerm
                    ? "Aucune leçon ne correspond à votre recherche."
                    : "Ce module ne contient pas encore de leçons."}
                </p>
                {searchTerm && (
                  <Button variant="outline" className="mt-4" onClick={() => setSearchTerm("")}>
                    Réinitialiser la recherche
                  </Button>
                )}
              </div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
                <ScrollArea className="h-[600px] pr-4">
                  <AnimatePresence>
                    {filteredLessons.map((lesson: any, index: number) => (
                      <motion.div key={lesson.id} variants={item} layout className="mb-4">
                        <Accordion type="single" collapsible>
                          <AccordionItem value={`lesson-${lesson.id}`} className="border rounded-lg shadow-sm">
                            <AccordionTrigger className="px-4 py-2 hover:bg-muted/50">
                              <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex items-center">
                                  <Badge className="mr-3 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                    {index + 1}
                                  </Badge>
                                  <span className="font-medium">{lesson.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {lesson.video_url && (
                                    <Badge variant="outline" className="flex items-center gap-1">
                                      <Youtube className="h-3 w-3" />
                                      Vidéo
                                    </Badge>
                                  )}
                                  {lesson.attachments && lesson.attachments.length > 0 && (
                                    <Badge variant="outline" className="flex items-center gap-1">
                                      <Paperclip className="h-3 w-3" />
                                      {lesson.attachments.length}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-sm font-medium mb-1">Description</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {lesson.description || "Aucune description disponible."}
                                  </p>
                                </div>

                                {lesson.video_url && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-1">URL de la vidéo</h4>
                                    <p className="text-sm text-blue-600 break-all">
                                      <a
                                        href={lesson.video_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline"
                                      >
                                        {lesson.video_url}
                                      </a>
                                    </p>
                                  </div>
                                )}

                                {lesson.attachments && lesson.attachments.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-1">Pièces jointes</h4>
                                    <ul className="space-y-1">
                                      {lesson.attachments.map((url: string, idx: number) => {
                                        const fileName = url.split("/").pop() || `Document ${idx + 1}`
                                        return (
                                          <li key={idx} className="text-sm">
                                            <a
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                              <FileText className="h-3 w-3" />
                                              {fileName}
                                            </a>
                                          </li>
                                        )
                                      })}
                                    </ul>
                                  </div>
                                )}

                                <div className="flex flex-wrap justify-end space-x-2 pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(lesson)}
                                    disabled={updateLoading}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Modifier
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        disabled={deleteLoading}
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Supprimer
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Êtes-vous sûr de vouloir supprimer la leçon "{lesson.title}" ? Cette action
                                          est irréversible.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteLesson(lesson.id)}
                                          className="bg-red-500 hover:bg-red-600"
                                        >
                                          {deleteLoading ? (
                                            <>
                                              <svg
                                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                              >
                                                <circle
                                                  className="opacity-25"
                                                  cx="12"
                                                  cy="12"
                                                  r="10"
                                                  stroke="currentColor"
                                                  strokeWidth="4"
                                                ></circle>
                                                <path
                                                  className="opacity-75"
                                                  fill="currentColor"
                                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                              </svg>
                                              Suppression...
                                            </>
                                          ) : (
                                            <>Supprimer</>
                                          )}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </ScrollArea>
              </motion.div>
            )}
          </>
        )}
      </TabsContent>

      <TabsContent value="create">
        <Card className="border-t-4 border-t-blue-500 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PlusCircle className="w-5 h-5 mr-2 text-blue-500" />
              Créer une nouvelle leçon
            </CardTitle>
            <CardDescription>Remplissez les détails de la leçon ci-dessous</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="course-select">
                    Cours parent <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedCourseId}
                    onValueChange={(value) => {
                      setSelectedCourseId(value)
                      setSelectedModuleId("")
                    }}
                    required
                  >
                    <SelectTrigger id="course-select">
                      <SelectValue placeholder="Sélectionner un cours" />
                    </SelectTrigger>
                    <SelectContent>
                      {coursesLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <svg
                            className="animate-spin h-5 w-5 text-primary"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        </div>
                      ) : coursesData?.getCourses.length === 0 ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">Aucun cours disponible</div>
                      ) : (
                        coursesData?.getCourses.map((course: any) => (
                          <SelectItem key={course.id} value={course.id.toString()}>
                            {course.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="module-select">
                    Module parent <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedModuleId}
                    onValueChange={setSelectedModuleId}
                    disabled={!selectedCourseId || modulesLoading}
                    required
                  >
                    <SelectTrigger id="module-select">
                      <SelectValue placeholder="Sélectionner un module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modulesLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <svg
                            className="animate-spin h-5 w-5 text-primary"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        </div>
                      ) : !modulesData?.getModulesByCourse || modulesData.getModulesByCourse.length === 0 ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          Aucun module disponible pour ce cours
                        </div>
                      ) : (
                        modulesData.getModulesByCourse.map((module: any) => (
                          <SelectItem key={module.id} value={module.id.toString()}>
                            {module.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lesson-title">
                  Titre de la leçon <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lesson-title"
                  placeholder="Titre de la leçon"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lesson-description">Description de la leçon</Label>
                <Textarea
                  id="lesson-description"
                  placeholder="Description détaillée de la leçon"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lesson-content">
                  Contenu de la leçon <span className="text-red-500">*</span>
                </Label>
                <WysiwygEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Commencez à rédiger le contenu de votre leçon..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="video-url">URL de la vidéo (optionnel)</Label>
                <Input
                  id="video-url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Ajoutez une URL YouTube pour enrichir votre leçon avec du contenu vidéo.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachments">Pièces jointes (optionnel)</Label>
                <AttachmentsInput value={attachments} onChange={setAttachments} />
                <p className="text-xs text-muted-foreground">
                  Ajoutez des liens vers des documents, des PDF ou d'autres ressources pour vos élèves.
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" className="w-full md:w-auto" disabled={createLoading || !selectedModuleId}>
                  {createLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Créer la leçon
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Dialog de modification */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la leçon</DialogTitle>
          </DialogHeader>

          {editingLesson && (
            <form onSubmit={handleUpdateLesson} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">
                  Titre de la leçon <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-title"
                  value={editingLesson.title}
                  onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description de la leçon</Label>
                <Textarea
                  id="edit-description"
                  value={editingLesson.description || ""}
                  onChange={(e) => setEditingLesson({ ...editingLesson, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-content">
                  Contenu de la leçon <span className="text-red-500">*</span>
                </Label>
                <WysiwygEditor
                  value={editingLesson.content || ""}
                  onChange={(value) => setEditingLesson({ ...editingLesson, content: value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-video-url">URL de la vidéo (optionnel)</Label>
                <Input
                  id="edit-video-url"
                  value={editingLesson.video_url || ""}
                  onChange={(e) => setEditingLesson({ ...editingLesson, video_url: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-attachments">Pièces jointes (optionnel)</Label>
                <AttachmentsInput
                  value={editingLesson.attachments || []}
                  onChange={(value) => setEditingLesson({ ...editingLesson, attachments: value })}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={updateLoading}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={updateLoading}>
                  {updateLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Enregistrer les modifications
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
