"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "@apollo/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { GET_COURSE_BY_ID, ADD_COMMENT, ADD_COMPETENCY, VALIDATE_COMPETENCY, RATE_COURSE } from "@/graphql/course"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import {
  Star,
  Clock,
  Plus,
  User,
  Book,
  MessageSquare,
  CheckCircle,
  Calendar,
  ArrowLeft,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function CourseDetails() {
  const { id } = useParams()
  const router = useRouter()
  const [newComment, setNewComment] = useState("")
  const [newCompetency, setNewCompetency] = useState({ name: "", description: "" })
  const [newFeedback, setNewFeedback] = useState("")
  const [newRating, setNewRating] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<number | null>(null)
  const isMobile = useMediaQuery("(max-width: 640px)")

  const [activeTab, setActiveTab] = useState("competencies")

  useEffect(() => {
    if (userData) {
      setUserId(Number(userData.id))
    }
  }, [userData])

  const { loading, error, data, refetch } = useQuery(GET_COURSE_BY_ID, {
    variables: { id: Number(id) },
    skip: !id,
    onError: (error) => {
      setErrorMessage(`Erreur lors du chargement du cours: ${error.message}`)
    },
  })

  const [addComment] = useMutation(ADD_COMMENT, {
    onError: (error) => setErrorMessage(`Erreur lors de l'ajout du commentaire: ${error.message}`),
  })

  const [addCompetency] = useMutation(ADD_COMPETENCY, {
    onError: (error) => setErrorMessage(`Erreur lors de l'ajout de la compétence: ${error.message}`),
  })

  const [validateCompetency] = useMutation(VALIDATE_COMPETENCY, {
    onError: (error) => setErrorMessage(`Erreur lors de la validation de la compétence: ${error.message}`),
  })

  const [rateCourse] = useMutation(RATE_COURSE, {
    onError: (error) => setErrorMessage(`Erreur lors de l'ajout du feedback: ${error.message}`),
  })

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Chargement des détails du cours...</p>
        </div>
      </div>
    )
  }

  if (error || !data || !data.getCourseInstructionById) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-2xl">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            {errorMessage || error?.message || "Impossible de charger les détails du cours."}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push("/instruction/courses")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la liste des cours
        </Button>
      </div>
    )
  }

  const course = data.getCourseInstructionById

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !userData) return

    try {
      await addComment({
        variables: {
          input: {
            courseId: Number(id),
            content: newComment,
            authorId: Number(userData.id),
          },
        },
      })
      setNewComment("")
      refetch()
    } catch (error) {
      console.error("Erreur lors de l'ajout du commentaire:", error)
      setErrorMessage(
        `Erreur lors de l'ajout du commentaire: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      )
    }
  }

  const handleAddCompetency = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCompetency.name.trim() || !newCompetency.description.trim()) return

    try {
      await addCompetency({
        variables: {
          input: {
            courseId: Number(id),
            name: newCompetency.name,
            description: newCompetency.description,
          },
        },
      })
      setNewCompetency({ name: "", description: "" })
      refetch()
    } catch (error) {
      console.error("Erreur lors de l'ajout de la compétence:", error)
    }
  }

  const handleValidateCompetency = async (competencyId: number) => {
    try {
      await validateCompetency({
        variables: { competencyId },
      })
      refetch()
    } catch (error) {
      console.error("Erreur lors de la validation de la compétence:", error)
    }
  }

  const handleAddFeedbackAndRating = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFeedback.trim() || newRating === 0) return

    try {
      await rateCourse({
        variables: {
          id: Number(id),
          rating: Math.round(newRating),
          feedback: newFeedback,
        },
      })
      setNewFeedback("")
      setNewRating(0)
      refetch()
    } catch (error) {
      console.error("Erreur lors de l'ajout du feedback et de la note:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "COMPLETED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "Planifié"
      case "IN_PROGRESS":
        return "En cours"
      case "COMPLETED":
        return "Terminé"
      default:
        return status
    }
  }

  const validatedCompetencies = course.competencies.filter((comp: any) => comp.validated).length
  const totalCompetencies = course.competencies.length
  const progressPercentage = totalCompetencies > 0 ? (validatedCompetencies / totalCompetencies) * 100 : 0
  const validComments = course.comments ? course.comments.filter((comment: any) => comment.author) : []

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
        <Link href="/instruction/courses" className="inline-flex items-center">
          <Button variant="ghost" className="p-0 hover:bg-transparent text-sm sm:text-base">
            <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Retour aux cours
          </Button>
        </Link>
        <Badge className={`${getStatusColor(course.status)} text-xs px-2 py-1 sm:px-3 sm:py-1 self-start sm:self-auto`}>
          {getStatusText(course.status)}
        </Badge>
      </div>

      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Détails du Cours</h1>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle>Informations du Cours</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 grid gap-4 sm:gap-6">
            <div className="flex flex-row items-center gap-3 sm:gap-4">
              <Avatar className="h-14 w-14 sm:h-20 sm:w-20 flex-shrink-0">
                <AvatarImage src="/placeholder.svg?height=80&width=80" alt={course.instructor.first_name} />
                <AvatarFallback>
                  <User className="h-7 w-7 sm:h-10 sm:w-10" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-base sm:text-xl font-semibold">
                  {course.instructor.first_name} {course.instructor.last_name}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Instructeur</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 gap-2 sm:gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm sm:text-base">
                  {format(parseISO(course.startTime), "d MMMM yyyy", { locale: fr })}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm sm:text-base">
                  {format(parseISO(course.startTime), "HH:mm", { locale: fr })} -
                  {course.endTime ? format(parseISO(course.endTime), " HH:mm", { locale: fr }) : " Non défini"}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Book className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm sm:text-base">
                  {totalCompetencies} compétence{totalCompetencies !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <Separator />
            <div className="flex flex-row items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt={course.student.first_name} />
                  <AvatarFallback>
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm sm:text-base font-medium">
                    {course.student.first_name} {course.student.last_name}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Élève</p>
                </div>
              </div>
              {course.rating && (
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-base sm:text-lg font-semibold">{course.rating}/5</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle>Progression</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
            <Progress value={progressPercentage} className="w-full h-2 sm:h-3" />
            <p className="text-center text-xs sm:text-sm font-medium">
              {validatedCompetencies} sur {totalCompetencies} compétence{totalCompetencies !== 1 ? "s" : ""} validée
              {validatedCompetencies !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="w-full space-y-6">
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("competencies")}
              className={`flex-1 flex items-center justify-center px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "competencies"
                  ? "bg-background text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Book className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Compétences</span>
              <span className="xs:hidden">Comp.</span>
            </button>
            <button
              onClick={() => setActiveTab("feedback")}
              className={`flex-1 flex items-center justify-center px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "feedback"
                  ? "bg-background text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Retour</span>
              <span className="xs:hidden">Ret.</span>
            </button>
            <button
              onClick={() => setActiveTab("comments")}
              className={`flex-1 flex items-center justify-center px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "comments"
                  ? "bg-background text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Commentaires</span>
              <span className="xs:hidden">Com.</span>
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === "competencies" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Compétences du Cours</h3>
                  <Badge variant="outline" className="ml-2">
                    {validatedCompetencies}/{totalCompetencies}
                  </Badge>
                </div>

                <ScrollArea className="w-full pr-4 h-[250px] sm:h-[300px]">
                  {course.competencies.length > 0 ? (
                    <ul className="space-y-3">
                      {course.competencies.map((competency: any) => (
                        <li key={competency.id} className="bg-muted/40 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={`competency-${competency.id}`}
                                checked={competency.validated}
                                onCheckedChange={() => handleValidateCompetency(competency.id)}
                                className="h-4 w-4"
                              />
                              <label htmlFor={`competency-${competency.id}`} className="text-sm font-medium">
                                {competency.name}
                              </label>
                            </div>
                            <Badge variant={competency.validated ? "default" : "outline"} className="text-xs">
                              {competency.validated ? "Validée" : "Non validée"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground ml-7">{competency.description}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Book className="mx-auto h-12 w-12 mb-2 opacity-20" />
                      <p className="text-sm">Aucune compétence n'a encore été ajoutée à ce cours.</p>
                    </div>
                  )}
                </ScrollArea>

                <Separator className="my-6" />

                <form onSubmit={handleAddCompetency} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="competency-name">Nouvelle compétence</Label>
                    <Input
                      id="competency-name"
                      placeholder="Nom de la compétence"
                      value={newCompetency.name}
                      onChange={(e) => setNewCompetency({ ...newCompetency, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="competency-description">Description</Label>
                    <Textarea
                      id="competency-description"
                      placeholder="Description de la compétence"
                      value={newCompetency.description}
                      onChange={(e) => setNewCompetency({ ...newCompetency, description: e.target.value })}
                      rows={3}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une compétence
                  </Button>
                </form>
              </div>
            )}

            {activeTab === "feedback" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Retour d'Expérience</h3>
                  {course.feedback ? (
                    <div className="space-y-4 bg-muted/40 p-4 rounded-lg">
                      <p className="text-sm">{course.feedback}</p>
                      {course.rating && (
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-5 h-5 ${
                                i < course.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
                              }`}
                            />
                          ))}
                          <span className="text-lg font-semibold ml-2">{course.rating}/5</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg">
                      <Star className="mx-auto h-12 w-12 mb-2 opacity-20" />
                      <p>Aucun retour d'expérience pour le moment.</p>
                    </div>
                  )}
                </div>

                <Separator />

                <form onSubmit={handleAddFeedbackAndRating} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="feedback">Ajouter un feedback</Label>
                    <Textarea
                      id="feedback"
                      placeholder="Votre retour d'expérience..."
                      value={newFeedback}
                      onChange={(e) => setNewFeedback(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rating">Note (sur 5)</Label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <Slider
                          id="rating"
                          min={0}
                          max={5}
                          step={0.5}
                          value={[newRating]}
                          onValueChange={(value) => setNewRating(value[0])}
                        />
                      </div>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 cursor-pointer ${
                              i < newRating
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
                            }`}
                            onClick={() => setNewRating(i + 1)}
                          />
                        ))}
                        <span className="ml-2 font-semibold">{newRating}</span>
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Envoyer le feedback et la note
                  </Button>
                </form>
              </div>
            )}

            {activeTab === "comments" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold mb-4">Commentaires</h3>
                <ScrollArea className="w-full pr-4 mb-4 h-[250px] sm:h-[300px]">
                  {validComments.length > 0 ? (
                    <ul className="space-y-4">
                      {validComments.map((comment: any) => (
                        <li key={comment.id} className="bg-muted/40 p-4 rounded-lg">
                          <div className="flex items-start space-x-4">
                            <Avatar className="mt-1">
                              <AvatarImage src="/placeholder.svg?height=40&width=40" alt={comment.author.first_name} />
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {comment.author.first_name} {comment.author.last_name || ""}
                              </p>
                              <p className="text-sm">{comment.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(parseISO(comment.creationDate), "d MMMM yyyy à HH:mm", { locale: fr })}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg">
                      <MessageSquare className="mx-auto h-12 w-12 mb-2 opacity-20" />
                      <p>Aucun commentaire pour le moment.</p>
                    </div>
                  )}
                </ScrollArea>
                <form onSubmit={handleAddComment} className="space-y-4">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ajouter un nouveau commentaire..."
                    className="w-full"
                    rows={3}
                    required
                  />
                  <Button type="submit" className="w-full">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Ajouter le Commentaire
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
