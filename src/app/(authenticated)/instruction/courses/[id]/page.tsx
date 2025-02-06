"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useQuery, useMutation } from "@apollo/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { GET_COURSE_BY_ID, ADD_COMMENT, ADD_COMPETENCY, VALIDATE_COMPETENCY, RATE_COURSE } from "@/graphql/course"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Star, Clock, Plus, User, Book, MessageSquare, CheckCircle, Calendar } from "lucide-react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useDecodedToken, useUserData } from "@/components/hooks/userHooks"

export default function CourseDetails() {
  const { id } = useParams()
  const [newComment, setNewComment] = useState("")
  const [newCompetency, setNewCompetency] = useState({ name: "", description: "" })
  const [newFeedback, setNewFeedback] = useState("")
  const [newRating, setNewRating] = useState(0)
  const userEmail = useDecodedToken();
  const userData = useUserData(userEmail);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    if (userData) {
      setUserId(Number(userData.id));
    }
  }, [userData]);

  const { loading, error, data, refetch } = useQuery(GET_COURSE_BY_ID, {
    variables: { id: userId },
  })
  const [addComment] = useMutation(ADD_COMMENT)
  const [addCompetency] = useMutation(ADD_COMPETENCY)
  const [validateCompetency] = useMutation(VALIDATE_COMPETENCY)
  const [rateCourse] = useMutation(RATE_COURSE)

  if (loading) return <div className="flex items-center justify-center h-screen">Chargement...</div>
  if (error) return <div className="flex items-center justify-center h-screen">Erreur : {error.message}</div>

  const course = data.getCourseInstructionById

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addComment({
        variables: {
          input: {
            courseId: Number.parseInt(id as string, 10),
            content: newComment,
            authorId: userId,
          },
        },
      })
      setNewComment("")
      refetch()
    } catch (error) {
      console.error("Erreur lors de l'ajout du commentaire:", error)
    }
  }

  const handleAddCompetency = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addCompetency({
        variables: {
          input: {
            courseId: Number.parseInt(id as string, 10),
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
    try {
      await rateCourse({
        variables: {
          id: Number.parseInt(id as string, 10),
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
        return "bg-primary text-dark-800 dark:bg-blue-900 dark:text-blue-200"
      case "IN_PROGRESS":
        return "bg-yellow-400 text-dark-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "COMPLETED":
        return "bg-destructive text-dark-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
    }
  }

  const validatedCompetencies = course.competencies.filter((comp: any) => comp.validated).length
  const totalCompetencies = course.competencies.length
  const progressPercentage = (validatedCompetencies / totalCompetencies) * 100

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl">
      <Link href="/instruction/courses" className="inline-flex items-center mb-4">
        <Button variant="ghost" className="p-0 hover:bg-transparent">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la liste des cours
        </Button>
      </Link>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Détails du Cours</h1>
        <Badge className={getStatusColor(course.status)}>{course.status}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informations du Cours</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src="/placeholder.svg?height=80&width=80" alt={course.instructor.first_name} />
                <AvatarFallback>
                  <User className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{course.instructor.first_name} {course.instructor.last_name} </h3>
                <p className="text-sm text-muted-foreground">Instructeur</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <span>{format(new Date(course.startTime), "d MMMM yyyy", { locale: fr })}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span>{format(new Date(course.startTime), "HH:mm", { locale: fr })} - {format(new Date(course.endTime), "HH:mm", { locale: fr })}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Book className="w-5 h-5 text-muted-foreground" />
                <span>{totalCompetencies} compétences</span>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt={course.student.first_name} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{course.student.first_name} {course.student.last_name}</p>
                  <p className="text-sm text-muted-foreground">Élève</p>
                </div>
              </div>
              {course.rating && (
                <div className="flex items-center space-x-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-lg font-semibold">{course.rating}/5</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progression</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progressPercentage} className="w-full" />
            <p className="text-center text-sm font-medium">
              {validatedCompetencies} sur {totalCompetencies} compétences validées
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="competencies" className="w-full space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="competencies">
            <Book className="w-4 h-4 mr-2" />
            Compétences
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <CheckCircle className="w-4 h-4 mr-2" />
            Retour
          </TabsTrigger>
          <TabsTrigger value="comments">
            <MessageSquare className="w-4 h-4 mr-2" />
            Commentaires
          </TabsTrigger>
        </TabsList>

        <TabsContent value="competencies">
          <Card>
            <CardHeader>
              <CardTitle>Compétences du Cours</CardTitle>
              <CardDescription>Liste des compétences à acquérir</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full pr-4">
                <ul className="space-y-4">
                  {course.competencies.map((competency: any) => (
                    <li key={competency.id} className="bg-secondary p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={`competency-${competency.id}`}
                            checked={competency.validated}
                            onCheckedChange={() => handleValidateCompetency(competency.id)}
                          />
                          <label htmlFor={`competency-${competency.id}`} className="text-sm font-medium">
                            {competency.name}
                          </label>
                        </div>
                        <Badge variant={competency.validated ? "default" : "secondary"}>
                          {competency.validated ? "Validée" : "Non validée"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground ml-7">{competency.description}</p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
            <CardFooter>
              <form onSubmit={handleAddCompetency} className="space-y-4 w-full">
                <Input
                  placeholder="Nom de la nouvelle compétence"
                  value={newCompetency.name}
                  onChange={(e) => setNewCompetency({ ...newCompetency, name: e.target.value })}
                />
                <Textarea
                  placeholder="Description de la compétence"
                  value={newCompetency.description}
                  onChange={(e) => setNewCompetency({ ...newCompetency, description: e.target.value })}
                  rows={3}
                />
                <Button type="submit" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une compétence
                </Button>
              </form>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle>Retour d'Expérience</CardTitle>
            </CardHeader>
            <CardContent>
              {course.feedback ? (
                <div className="space-y-4">
                  <p className="text-sm">{course.feedback}</p>
                  {course.rating && (
                    <div className="flex items-center space-x-2">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-lg font-semibold">{course.rating}/5</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun retour d'expérience pour le moment.</p>
              )}
              <Separator className="my-6" />
              <form onSubmit={handleAddFeedbackAndRating} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="feedback">Ajouter un feedback</Label>
                  <Textarea
                    id="feedback"
                    placeholder="Votre retour d'expérience..."
                    value={newFeedback}
                    onChange={(e) => setNewFeedback(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating">Note (sur 5)</Label>
                  <div className="flex items-center space-x-4">
                    <Slider
                      id="rating"
                      min={0}
                      max={5}
                      step={0.5}
                      value={[newRating]}
                      onValueChange={(value) => setNewRating(value[0])}
                    />
                    <span className="font-semibold">{newRating}</span>
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Envoyer le feedback et la note
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle>Commentaires</CardTitle>
              <CardDescription>Discussions sur le cours</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full pr-4 mb-4">
                <ul className="space-y-4">
                  {course.comments.map((comment: any) => (
                    <li key={comment.id} className="bg-secondary p-4 rounded-lg">
                      <div className="flex items-start space-x-4">
                        <Avatar className="mt-1">
                          <AvatarImage src="/placeholder.svg?height=40&width=40" alt={comment.author.first_name} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{comment.author.first_name}</p>
                          <p className="text-sm">{comment.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(comment.creationDate), "d MMMM yyyy à HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              <form onSubmit={handleAddComment} className="space-y-4">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajouter un nouveau commentaire..."
                  className="w-full"
                  rows={3}
                />
                <Button type="submit" className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Ajouter le Commentaire
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
