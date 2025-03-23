"use client"

import type React from "react"

import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { GET_COURSES, CREATE_COURSE, UPDATE_COURSE, DELETE_COURSE } from "@/graphql/learningAdmin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { PlusCircle, Book, Edit, Trash2, Search, Filter, CheckCircle2, Info, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "@/components/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

enum LicenseType {
  PPL = "PPL",
  CPL = "CPL",
  ATPL = "ATPL",
}

export function CourseManagement() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [requiredLicense, setRequiredLicense] = useState<LicenseType | "">("")
  const [editingCourse, setEditingCourse] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterLicense, setFilterLicense] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("list")

  const { data, loading, error, refetch } = useQuery(GET_COURSES)
  const [createCourse, { loading: createLoading }] = useMutation(CREATE_COURSE, {
    onCompleted: () => {
      refetch()
      toast({
        title: "Cours créé avec succès",
        description: "Le cours a été ajouté à la plateforme.",
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

  const [updateCourse, { loading: updateLoading }] = useMutation(UPDATE_COURSE, {
    onCompleted: () => {
      refetch()
      setIsEditDialogOpen(false)
      toast({
        title: "Cours mis à jour",
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

  const [deleteCourse, { loading: deleteLoading }] = useMutation(DELETE_COURSE, {
    onCompleted: () => {
      refetch()
      toast({
        title: "Cours supprimé",
        description: "Le cours a été supprimé avec succès.",
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
    setCategory("")
    setRequiredLicense("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createCourse({
        variables: {
          createCourseInput: {
            title,
            description,
            category,
            required_license: requiredLicense || null,
          },
        },
      })
    } catch (err) {
      console.error("Error creating course:", err)
    }
  }

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateCourse({
        variables: {
          id: parseFloat(editingCourse.id),
          updateCourseInput: {
            title: editingCourse.title,
            description: editingCourse.description,
            category: editingCourse.category,
            required_license: editingCourse.required_license || null,
          },
        },
      })
    } catch (err) {
      console.error("Error updating course:", err)
    }
  }

  const handleDeleteCourse = async (id: string) => {
    try {
      await deleteCourse({
        variables: { id: Number.parseInt(id) },
      })
    } catch (err) {
      console.error("Error deleting course:", err)
    }
  }

  const openEditDialog = (course: any) => {
    setEditingCourse(course)
    setIsEditDialogOpen(true)
  }

  // Filtrer les cours
  const filteredCourses = data?.getCourses
    ? data.getCourses.filter((course: any) => {
        const matchesSearch =
          course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.category?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesLicense =
          filterLicense === "all" ||
          (filterLicense === "none" && !course.required_license) ||
          course.required_license === filterLicense

        return matchesSearch && matchesLicense
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
          <Book className="h-4 w-4" />
          Liste des cours
        </TabsTrigger>
        <TabsTrigger value="create" className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Créer un cours
        </TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un cours..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Select value={filterLicense} onValueChange={setFilterLicense}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filtrer par licence" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les licences</SelectItem>
              <SelectItem value="none">Aucune licence requise</SelectItem>
              <SelectItem value={LicenseType.PPL}>PPL</SelectItem>
              <SelectItem value={LicenseType.CPL}>CPL</SelectItem>
              <SelectItem value={LicenseType.ATPL}>ATPL</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
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
            {filteredCourses.length === 0 ? (
              <div className="text-center py-12">
                <Book className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                <h3 className="mt-4 text-lg font-medium">Aucun cours trouvé</h3>
                <p className="text-muted-foreground mt-2">
                  {searchTerm || filterLicense !== "all"
                    ? "Aucun cours ne correspond à vos critères de recherche."
                    : "Commencez par créer un nouveau cours."}
                </p>
                {(searchTerm || filterLicense !== "all") && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchTerm("")
                      setFilterLicense("all")
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                )}
                <Button className="mt-4 ml-2" onClick={() => setActiveTab("create")}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Créer un cours
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
                  {filteredCourses.map((course: any) => (
                    <motion.div key={course.id} variants={item} layout>
                      <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg flex items-center">
                              <Book className="w-5 h-5 mr-2 text-blue-500" />
                              <span className="line-clamp-1">{course.title}</span>
                            </CardTitle>
                            {course.category && (
                              <Badge variant="outline" className="ml-2 shrink-0">
                                {course.category}
                              </Badge>
                            )}
                          </div>
                          {course.required_license && (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mt-1">
                              Licence {course.required_license}
                            </Badge>
                          )}
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {course.description || "Aucune description disponible."}
                          </p>
                        </CardContent>
                        <CardFooter className="flex justify-end space-x-2 pt-2 border-t">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(course)}
                                  disabled={updateLoading}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Modifier
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Modifier les informations du cours</p>
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
                                  <p>Supprimer définitivement ce cours</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer le cours "{course.title}" ? Cette action est
                                  irréversible et supprimera également tous les modules et leçons associés.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCourse(course.id)}
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
              Créer un nouveau cours
            </CardTitle>
            <CardDescription>Remplissez les détails du cours ci-dessous</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Titre du cours <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Titre du cours"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description du cours</Label>
                <Textarea
                  id="description"
                  placeholder="Description détaillée du cours"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Input
                    id="category"
                    placeholder="Ex: Navigation, Météorologie, etc."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="license">Licence requise</Label>
                  <Select value={requiredLicense} onValueChange={(value) => setRequiredLicense(value as LicenseType)}>
                    <SelectTrigger id="license">
                      <SelectValue placeholder="Sélectionner une licence (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      <SelectItem value={LicenseType.PPL}>PPL</SelectItem>
                      <SelectItem value={LicenseType.CPL}>CPL</SelectItem>
                      <SelectItem value={LicenseType.ATPL}>ATPL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                <Button type="submit" className="w-full md:w-auto" disabled={createLoading}>
                  {createLoading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Créer le cours
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
            <DialogTitle>Modifier le cours</DialogTitle>
            <DialogDescription>Modifiez les informations du cours ci-dessous</DialogDescription>
          </DialogHeader>

          {editingCourse && (
            <form onSubmit={handleUpdateCourse} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">
                  Titre du cours <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-title"
                  value={editingCourse.title}
                  onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description du cours</Label>
                <Textarea
                  id="edit-description"
                  value={editingCourse.description || ""}
                  onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Catégorie</Label>
                  <Input
                    id="edit-category"
                    value={editingCourse.category || ""}
                    onChange={(e) => setEditingCourse({ ...editingCourse, category: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-license">Licence requise</Label>
                  <Select
                    value={editingCourse.required_license || ""}
                    onValueChange={(value) => setEditingCourse({ ...editingCourse, required_license: value })}
                  >
                    <SelectTrigger id="edit-license">
                      <SelectValue placeholder="Sélectionner une licence (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      <SelectItem value={LicenseType.PPL}>PPL</SelectItem>
                      <SelectItem value={LicenseType.CPL}>CPL</SelectItem>
                      <SelectItem value={LicenseType.ATPL}>ATPL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
