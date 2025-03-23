"use client"

import type React from "react"

import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import {
  GET_COURSES,
  GET_MODULES_BY_COURSE,
  CREATE_MODULE,
  UPDATE_MODULE,
  DELETE_MODULE,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Layers, BookOpen, Edit, Trash2, Search, CheckCircle2, Info, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "@/components/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function ModuleManagement() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [courseId, setCourseId] = useState("")
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [editingModule, setEditingModule] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("list")

  const { data: coursesData, loading: coursesLoading } = useQuery(GET_COURSES)
  const {
    data: modulesData,
    loading: modulesLoading,
    error,
    refetch,
  } = useQuery(GET_MODULES_BY_COURSE, {
    variables: { courseId: Number.parseFloat(selectedCourseId) },
    skip: !selectedCourseId,
  })

  const [createModule, { loading: createLoading }] = useMutation(CREATE_MODULE, {
    onCompleted: () => {
      refetch()
      toast({
        title: "Module créé avec succès",
        description: "Le module a été ajouté au cours sélectionné.",
        variant: "default",
      })
      resetForm()
      setActiveTab("list")
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de la création",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const [updateModule, { loading: updateLoading }] = useMutation(UPDATE_MODULE, {
    onCompleted: () => {
      refetch()
      setIsEditDialogOpen(false)
      toast({
        title: "Module mis à jour",
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

  const [deleteModule, { loading: deleteLoading }] = useMutation(DELETE_MODULE, {
    onCompleted: () => {
      refetch()
      toast({
        title: "Module supprimé",
        description: "Le module a été supprimé avec succès.",
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
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createModule({
        variables: {
          createModuleInput: {
            title,
            description,
            courseId: Number.parseInt(courseId),
          },
        },
      })
    } catch (err) {
      console.error("Error creating module:", err)
    }
  }

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateModule({
        variables: {
          id: editingModule.id,
          updateModuleInput: {
            title: editingModule.title,
            description: editingModule.description,
            courseId: Number.parseInt(editingModule.courseId),
          },
        },
      })
    } catch (err) {
      console.error("Error updating module:", err)
    }
  }

  const handleDeleteModule = async (id: string) => {
    try {
      await deleteModule({
        variables: { id: Number.parseInt(id) },
      })
    } catch (err) {
      console.error("Error deleting module:", err)
    }
  }

  const openEditDialog = (module: any) => {
    setEditingModule(module)
    setIsEditDialogOpen(true)
  }

  // Filtrer les modules
  const filteredModules = modulesData?.getModulesByCourse
    ? modulesData.getModulesByCourse.filter((module: any) => {
        return (
          module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          module.description?.toLowerCase().includes(searchTerm.toLowerCase())
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
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="list" className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Liste des modules
        </TabsTrigger>
        <TabsTrigger value="create" className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Créer un module
        </TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger className="w-full">
                      <div className="flex items-center">
                        <BookOpen className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Sélectionner un cours" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {coursesData?.getCourses.map((course: any) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sélectionnez un cours pour voir ses modules</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {selectedCourseId && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un module..."
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
                Sélectionnez un cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Veuillez sélectionner un cours pour voir ses modules.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {!coursesLoading &&
                  coursesData?.getCourses &&
                  coursesData.getCourses.slice(0, 5).map((course: any) => (
                    <Button
                      key={course.id}
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCourseId(course.id.toString())}
                      className="flex items-center"
                    >
                      <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                      {course.title}
                    </Button>
                  ))}
              </div>
            </CardContent>
          </Card>
        ) : modulesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
          <Card className="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="h-5 w-5 mr-2" />
                Erreur de chargement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error.message}</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => refetch()}>
                Réessayer
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <>
            {filteredModules.length === 0 ? (
              <div className="text-center py-12">
                <Layers className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                <h3 className="mt-4 text-lg font-medium">Aucun module trouvé</h3>
                <p className="text-muted-foreground mt-2">
                  {searchTerm
                    ? "Aucun module ne correspond à votre recherche."
                    : "Ce cours ne contient pas encore de modules."}
                </p>
                {searchTerm && (
                  <Button variant="outline" className="mt-4" onClick={() => setSearchTerm("")}>
                    Réinitialiser la recherche
                  </Button>
                )}
                <Button
                  className="mt-4 ml-2"
                  onClick={() => {
                    setCourseId(selectedCourseId)
                    setActiveTab("create")
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Créer un module
                </Button>
              </div>
            ) : (
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                <AnimatePresence>
                  {filteredModules.map((module: any) => (
                    <motion.div key={module.id} variants={item} layout>
                      <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center">
                            <Layers className="w-5 h-5 mr-2 text-blue-500" />
                            <span className="line-clamp-1">{module.title}</span>
                          </CardTitle>
                          {module.lessons && (
                            <Badge variant="outline" className="mt-1">
                              {module.lessons.length} leçon{module.lessons.length !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {module.description || "Aucune description disponible."}
                          </p>
                        </CardContent>
                        <CardFooter className="flex justify-end space-x-2 pt-2 border-t">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(module)}
                                  disabled={updateLoading}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Modifier
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Modifier les informations du module</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <AlertDialog>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
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
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Supprimer définitivement ce module</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer le module "{module.title}" ? Cette action est
                                  irréversible et supprimera également toutes les leçons associées.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteModule(module.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  {deleteLoading ? (
                                    <>
                                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                      Suppression...
                                    </>
                                  ) : (
                                    <>Supprimer</>
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
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
              Créer un nouveau module
            </CardTitle>
            <CardDescription>Remplissez les détails du module ci-dessous</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="course-select">
                  Cours parent <span className="text-red-500">*</span>
                </Label>
                <Select value={courseId} onValueChange={setCourseId} required defaultValue={selectedCourseId}>
                  <SelectTrigger id="course-select">
                    <SelectValue placeholder="Sélectionner un cours" />
                  </SelectTrigger>
                  <SelectContent>
                    {coursesLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="animate-spin h-5 w-5 text-primary" />
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
                <Label htmlFor="module-title">
                  Titre du module <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="module-title"
                  placeholder="Titre du module"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="module-description">Description du module</Label>
                <Textarea
                  id="module-description"
                  placeholder="Description détaillée du module"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="pt-4 flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setActiveTab("list")
                    resetForm()
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={createLoading || !courseId}>
                  {createLoading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Créer le module
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le module</DialogTitle>
          </DialogHeader>

          {editingModule && (
            <form onSubmit={handleUpdateModule} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">
                  Titre du module <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-title"
                  value={editingModule.title}
                  onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description du module</Label>
                <Textarea
                  id="edit-description"
                  value={editingModule.description || ""}
                  onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                  rows={4}
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
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
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
