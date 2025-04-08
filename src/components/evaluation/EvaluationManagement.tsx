"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@apollo/client"
import {
  GET_MODULES,
  GET_EVALUATIONS,
  CREATE_EVALUATION,
  CREATE_QUESTION,
  UPDATE_EVALUATION,
  UPDATE_QUESTION,
  DELETE_EVALUATION,
  DELETE_QUESTION,
} from "@/graphql/learningAdmin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Trash2,
  Check,
  Book,
  HelpCircle,
  Edit,
  PlusCircle,
  ClipboardList,
  Search,
  CheckCircle2,
  Layers,
  Loader2,
  ArrowLeft,
  Info,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "@/components/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

export function EvaluationManagement() {
  const [activeTab, setActiveTab] = useState("view")
  const [step, setStep] = useState(1)
  const [selectedModuleId, setSelectedModuleId] = useState("")
  const [passScore, setPassScore] = useState("70")
  const [questionContent, setQuestionContent] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [correctAnswer, setCorrectAnswer] = useState("")
  const [selectedEvaluationId, setSelectedEvaluationId] = useState("")
  const [editingEvaluation, setEditingEvaluation] = useState<any>(null)
  const [editingQuestion, setEditingQuestion] = useState<any>(null)
  const [isEditEvaluationOpen, setIsEditEvaluationOpen] = useState(false)
  const [isEditQuestionOpen, setIsEditQuestionOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentEvaluation, setCurrentEvaluation] = useState<any>(null)

  const { data: modulesData, loading: modulesLoading } = useQuery(GET_MODULES)
  const { data: evaluationsData, loading, error: queryError, refetch: refetchEvaluations } = useQuery(GET_EVALUATIONS)

  const [createEvaluation, { loading: createEvalLoading }] = useMutation(CREATE_EVALUATION, {
    onCompleted: (data) => {
      if (data && data.createEvaluation && data.createEvaluation.id) {
        setSelectedEvaluationId(data.createEvaluation.id)
        setStep(2)
        toast({
          title: "Évaluation créée",
          description: "Vous pouvez maintenant ajouter des questions.",
          variant: "default",
        })
      }
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de la création",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const [createQuestion, { loading: createQuestionLoading }] = useMutation(CREATE_QUESTION, {
    onCompleted: () => {
      setQuestionContent("")
      setOptions(["", ""])
      setCorrectAnswer("")
      refetchEvaluations()
      toast({
        title: "Question ajoutée",
        description: "La question a été ajoutée à l'évaluation.",
        variant: "default",
      })
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de l'ajout",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const [updateEvaluation, { loading: updateEvalLoading }] = useMutation(UPDATE_EVALUATION, {
    onCompleted: () => {
      refetchEvaluations()
      setIsEditEvaluationOpen(false)
      toast({
        title: "Évaluation mise à jour",
        description: "Les modifications ont été enregistrées.",
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

  const [updateQuestion, { loading: updateQuestionLoading }] = useMutation(UPDATE_QUESTION, {
    onCompleted: () => {
      refetchEvaluations()
      setIsEditQuestionOpen(false)
      toast({
        title: "Question mise à jour",
        description: "Les modifications ont été enregistrées.",
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

  const [deleteEvaluation, { loading: deleteEvalLoading }] = useMutation(DELETE_EVALUATION, {
    onCompleted: () => {
      refetchEvaluations()
      toast({
        title: "Évaluation supprimée",
        description: "L'évaluation a été supprimée avec succès.",
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

  const [deleteQuestion, { loading: deleteQuestionLoading }] = useMutation(DELETE_QUESTION, {
    onCompleted: () => {
      refetchEvaluations()
      toast({
        title: "Question supprimée",
        description: "La question a été supprimée avec succès.",
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

  const handleCreateEvaluation = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createEvaluation({
        variables: {
          createEvaluationInput: {
            moduleId: Number.parseInt(selectedModuleId),
            pass_score: Number.parseInt(passScore),
          },
        },
      })
    } catch (err) {
      console.error("Error creating evaluation:", err)
    }
  }

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault()

    // Vérifier que toutes les options sont remplies
    const validOptions = options.filter((option) => option.trim() !== "")
    if (validOptions.length < 2) {
      toast({
        title: "Erreur de validation",
        description: "Vous devez fournir au moins deux options de réponse.",
        variant: "destructive",
      })
      return
    }

    // Vérifier qu'une réponse correcte est sélectionnée
    if (!correctAnswer) {
      toast({
        title: "Erreur de validation",
        description: "Vous devez sélectionner une réponse correcte.",
        variant: "destructive",
      })
      return
    }

    try {
      await createQuestion({
        variables: {
          evaluationId: parseFloat(selectedEvaluationId),
          createQuestionInput: {
            content: { text: questionContent },
            options: validOptions,
            correct_answer: correctAnswer,
          },
        },
      })
    } catch (err) {
      console.error("Error creating question:", err)
    }
  }

  const handleUpdateEvaluation = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateEvaluation({
        variables: {
          updateEvaluationInput: {
            id: editingEvaluation.id,
            pass_score: Number.parseInt(editingEvaluation.pass_score),
          },
        },
      })
    } catch (err) {
      console.error("Error updating evaluation:", err)
    }
  }

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault()

    // Vérifier que toutes les options sont remplies
    const validOptions = editingQuestion.options.filter((option: string) => option.trim() !== "")
    if (validOptions.length < 2) {
      toast({
        title: "Erreur de validation",
        description: "Vous devez fournir au moins deux options de réponse.",
        variant: "destructive",
      })
      return
    }

    // Vérifier qu'une réponse correcte est sélectionnée
    if (!editingQuestion.correct_answer) {
      toast({
        title: "Erreur de validation",
        description: "Vous devez sélectionner une réponse correcte.",
        variant: "destructive",
      })
      return
    }

    try {
      await updateQuestion({
        variables: {
          updateQuestionInput: {
            id: editingQuestion.id,
            content: { text: editingQuestion.content.text },
            options: validOptions,
            correct_answer: editingQuestion.correct_answer,
          },
        },
      })
    } catch (err) {
      console.error("Error updating question:", err)
    }
  }

  const handleDeleteEvaluation = async (id: string) => {
    try {
      await deleteEvaluation({
        variables: { id: Number.parseInt(id) },
      })
    } catch (err) {
      console.error("Error deleting evaluation:", err)
    }
  }

  const handleDeleteQuestion = async (id: string) => {
    try {
      await deleteQuestion({
        variables: { id: Number.parseInt(id) },
      })
    } catch (err) {
      console.error("Error deleting question:", err)
    }
  }

  const addOption = () => setOptions([...options, ""])

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      toast({
        title: "Action impossible",
        description: "Une question doit avoir au moins deux options.",
        variant: "destructive",
      })
      return
    }

    const newOptions = [...options]
    newOptions.splice(index, 1)
    setOptions(newOptions)

    // Si l'option supprimée était la réponse correcte, réinitialiser la réponse correcte
    if (options[index] === correctAnswer) {
      setCorrectAnswer("")
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)

    // Mettre à jour la réponse correcte si elle correspond à l'option modifiée
    if (correctAnswer === options[index]) {
      setCorrectAnswer(value)
    }
  }

  // Filtrer les évaluations
  const filteredEvaluations = evaluationsData?.getEvaluations
    ? evaluationsData.getEvaluations.filter((evaluation: any) => {
        const moduleTitle = evaluation.module?.title?.toLowerCase() || ""
        return moduleTitle.includes(searchTerm.toLowerCase())
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

  // Trouver l'évaluation actuelle pour l'affichage des questions
  useEffect(() => {
    if (selectedEvaluationId && evaluationsData?.getEvaluations) {
      const evaluation = evaluationsData.getEvaluations.find((e: any) => e.id.toString() === selectedEvaluationId)
      setCurrentEvaluation(evaluation)
    }
  }, [selectedEvaluationId, evaluationsData])

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="view" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Liste des évaluations
        </TabsTrigger>
        <TabsTrigger value="create" className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Créer une évaluation
        </TabsTrigger>
      </TabsList>

      <TabsContent value="view" className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par module..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
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
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : queryError ? (
          <Card className="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="h-5 w-5 mr-2" />
                Erreur de chargement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{queryError.message}</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => refetchEvaluations()}>
                Réessayer
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <>
            {filteredEvaluations.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                <h3 className="mt-4 text-lg font-medium">Aucune évaluation trouvée</h3>
                <p className="text-muted-foreground mt-2">
                  {searchTerm
                    ? "Aucune évaluation ne correspond à votre recherche."
                    : "Commencez par créer une nouvelle évaluation."}
                </p>
                {searchTerm && (
                  <Button variant="outline" className="mt-4" onClick={() => setSearchTerm("")}>
                    Réinitialiser la recherche
                  </Button>
                )}
                <Button className="mt-4 ml-2" onClick={() => setActiveTab("create")}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Créer une évaluation
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-15rem)]">
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4"
                >
                  <AnimatePresence>
                    {filteredEvaluations.map((evaluation: any) => (
                      <motion.div key={evaluation.id} variants={item} layout>
                        <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg flex items-center">
                                <Book className="w-5 h-5 mr-2 text-blue-500" />
                                <span className="line-clamp-1">{evaluation.module?.title || "Module inconnu"}</span>
                              </CardTitle>
                              <Badge variant="outline">
                                {evaluation.questions.length} question{evaluation.questions.length !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                            <CardDescription className="flex items-center mt-1">
                              <Layers className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                              Module {evaluation.module?.id || "?"}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pb-2 flex-grow">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <span>Score de réussite</span>
                                <span className="font-medium">{evaluation.pass_score}%</span>
                              </div>
                              <Progress value={evaluation.pass_score} className="h-2" />
                            </div>
                          </CardContent>
                          <CardFooter className="flex flex-wrap justify-between pt-2 border-t mt-auto gap-2">
                            <Dialog>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <HelpCircle className="w-4 h-4 mr-2" />
                                        Questions
                                      </Button>
                                    </DialogTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Voir et gérer les questions</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center">
                                    <ClipboardList className="w-5 h-5 mr-2 text-blue-500" />
                                    Questions de l'évaluation
                                  </DialogTitle>
                                </DialogHeader>

                                <div className="flex-grow overflow-hidden flex flex-col">
                                  <div className="flex justify-between items-center mb-4">
                                    <div>
                                      <h3 className="font-medium">{evaluation.module?.title || "Module inconnu"}</h3>
                                      <p className="text-sm text-muted-foreground">
                                        Score de réussite : {evaluation.pass_score}% | {evaluation.questions.length}{" "}
                                        questions
                                      </p>
                                    </div>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setEditingEvaluation(evaluation)
                                              setIsEditEvaluationOpen(true)
                                            }}
                                          >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Modifier l'évaluation
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Modifier les paramètres de l'évaluation</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>

                                  <Separator className="my-2" />

                                  <ScrollArea className="flex-grow pr-4">
                                    <div className="space-y-4">
                                      {evaluation.questions.length === 0 ? (
                                        <div className="text-center py-8">
                                          <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                                          <p className="mt-2 text-muted-foreground">
                                            Aucune question dans cette évaluation
                                          </p>
                                          <Button
                                            variant="outline"
                                            className="mt-4"
                                            onClick={() => {
                                              setSelectedEvaluationId(evaluation.id)
                                              setStep(2)
                                              setActiveTab("create")
                                            }}
                                          >
                                            <PlusCircle className="w-4 h-4 mr-2" />
                                            Ajouter des questions
                                          </Button>
                                        </div>
                                      ) : (
                                        <Accordion type="multiple" className="w-full">
                                          {evaluation.questions.map((question: any, index: number) => (
                                            <AccordionItem
                                              key={question.id}
                                              value={question.id}
                                              className="border rounded-lg mb-3"
                                            >
                                              <AccordionTrigger className="px-4 py-2 hover:bg-muted/50">
                                                <div className="flex items-center text-left">
                                                  <Badge className="mr-3 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                    {index + 1}
                                                  </Badge>
                                                  <span className="font-medium line-clamp-1">
                                                    {question.content.text}
                                                  </span>
                                                </div>
                                              </AccordionTrigger>
                                              <AccordionContent className="px-4 pb-4">
                                                <div className="space-y-4">
                                                  <div>
                                                    <h4 className="text-sm font-medium mb-2">Options de réponse</h4>
                                                    <ul className="space-y-2">
                                                      {question.options.map((option: string, optionIndex: number) => (
                                                        <li key={optionIndex} className="flex items-center">
                                                          <div
                                                            className={`flex items-center p-2 rounded-md ${
                                                              option === question.correct_answer
                                                                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                                                                : "bg-muted/50"
                                                            } w-full`}
                                                          >
                                                            {option === question.correct_answer && (
                                                              <Check className="w-4 h-4 mr-2 text-green-500 shrink-0" />
                                                            )}
                                                            <span>{option}</span>
                                                          </div>
                                                        </li>
                                                      ))}
                                                    </ul>
                                                  </div>

                                                  <div className="flex justify-end space-x-2 pt-2">
                                                    <TooltipProvider>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                              setEditingQuestion(question)
                                                              setIsEditQuestionOpen(true)
                                                            }}
                                                            disabled={updateQuestionLoading}
                                                          >
                                                            <Edit className="w-4 h-4 mr-2" />
                                                            Modifier
                                                          </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                          <p>Modifier cette question</p>
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
                                                                disabled={deleteQuestionLoading}
                                                              >
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Supprimer
                                                              </Button>
                                                            </AlertDialogTrigger>
                                                          </TooltipTrigger>
                                                          <TooltipContent>
                                                            <p>Supprimer définitivement cette question</p>
                                                          </TooltipContent>
                                                        </Tooltip>
                                                      </TooltipProvider>
                                                      <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                                          <AlertDialogDescription>
                                                            Êtes-vous sûr de vouloir supprimer cette question ? Cette
                                                            action est irréversible.
                                                          </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                          <AlertDialogAction
                                                            onClick={() => handleDeleteQuestion(question.id)}
                                                            className="bg-red-500 hover:bg-red-600"
                                                          >
                                                            {deleteQuestionLoading ? (
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
                                                  </div>
                                                </div>
                                              </AccordionContent>
                                            </AccordionItem>
                                          ))}
                                        </Accordion>
                                      )}
                                    </div>
                                  </ScrollArea>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <div className="flex gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingEvaluation(evaluation)
                                        setIsEditEvaluationOpen(true)
                                      }}
                                      disabled={updateEvalLoading}
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Modifier
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Modifier les paramètres de l'évaluation</p>
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
                                          disabled={deleteEvalLoading}
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Supprimer
                                        </Button>
                                      </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Supprimer définitivement cette évaluation</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Êtes-vous sûr de vouloir supprimer cette évaluation ? Cette action est
                                      irréversible et supprimera également toutes les questions associées.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteEvaluation(evaluation.id)}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      {deleteEvalLoading ? (
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
                            </div>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </ScrollArea>
            )}
          </>
        )}
      </TabsContent>

      <TabsContent value="create">
        <Card className="border-t-4 border-t-blue-500 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              {step === 1 ? (
                <>
                  <PlusCircle className="w-5 h-5 mr-2 text-blue-500" />
                  Créer une nouvelle évaluation
                </>
              ) : (
                <>
                  <HelpCircle className="w-5 h-5 mr-2 text-blue-500" />
                  Ajouter des questions à l'évaluation
                </>
              )}
            </CardTitle>
            <CardDescription>
              {step === 1
                ? "Étape 1: Définir les paramètres de l'évaluation"
                : "Étape 2: Ajouter des questions à l'évaluation"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleCreateEvaluation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="module-select">
                    Module associé <span className="text-red-500">*</span>
                  </Label>
                  <Select value={selectedModuleId} onValueChange={setSelectedModuleId} required>
                    <SelectTrigger id="module-select">
                      <SelectValue placeholder="Sélectionner un module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modulesLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="animate-spin h-5 w-5 text-primary" />
                        </div>
                      ) : !modulesData?.getAllModules || modulesData.getAllModules.length === 0 ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">Aucun module disponible</div>
                      ) : (
                        modulesData.getAllModules.map((module: any) => (
                          <SelectItem key={module.id} value={module.id.toString()}>
                            {module.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pass-score">
                    Score de réussite (%) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pass-score"
                    type="number"
                    min="1"
                    max="100"
                    value={passScore}
                    onChange={(e) => setPassScore(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Pourcentage minimum de bonnes réponses pour réussir l'évaluation.
                  </p>
                </div>

                <div className="pt-4 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setActiveTab("view")
                    }}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" className="w-full md:w-auto" disabled={createEvalLoading || !selectedModuleId}>
                    {createEvalLoading ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Création en cours...
                      </>
                    ) : (
                      <>Créer l'évaluation et passer aux questions</>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateQuestion} className="space-y-4">
                {currentEvaluation && (
                  <div className="bg-blue-50 p-3 rounded-md mb-4 dark:bg-blue-900/20">
                    <h3 className="font-medium flex items-center">
                      <Book className="w-4 h-4 mr-2 text-blue-500" />
                      {currentEvaluation.module?.title || "Module inconnu"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Score de réussite : {currentEvaluation.pass_score}% |{currentEvaluation.questions.length} question
                      {currentEvaluation.questions.length !== 1 ? "s" : ""} déjà ajoutée
                      {currentEvaluation.questions.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="question-content">
                    Question <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="question-content"
                    value={questionContent}
                    onChange={(e) => setQuestionContent(e.target.value)}
                    placeholder="Saisissez le texte de la question"
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      Options de réponse <span className="text-red-500">*</span>
                    </Label>
                    <Button type="button" onClick={addOption} variant="outline" size="sm" className="h-7 text-xs">
                      <PlusCircle className="h-3 w-3 mr-1" />
                      Ajouter une option
                    </Button>
                  </div>

                  <div className="space-y-2 mt-2">
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => removeOption(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    Réponse correcte <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup value={correctAnswer} onValueChange={setCorrectAnswer} className="space-y-2">
                    {options.map(
                      (option, index) =>
                        option.trim() && (
                          <div
                            key={index}
                            className="flex items-center space-x-2 rounded-md border p-3 hover:bg-muted/50"
                          >
                            <RadioGroupItem value={option} id={`option-${index}`} />
                            <Label htmlFor={`option-${index}`} className="flex-grow cursor-pointer">
                              {option}
                            </Label>
                          </div>
                        ),
                    )}
                  </RadioGroup>
                  {options.filter((o) => o.trim()).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Ajoutez des options de réponse pour pouvoir sélectionner la réponse correcte.
                    </p>
                  )}
                </div>

                <div className="pt-4 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setActiveTab("view")
                      setStep(1)
                    }}
                    className="flex items-center"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour à la liste
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createQuestionLoading ||
                      !questionContent ||
                      options.filter((o) => o.trim()).length < 2 ||
                      !correctAnswer
                    }
                  >
                    {createQuestionLoading ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Ajout en cours...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Ajouter la question
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Dialog de modification d'évaluation */}
      <Dialog open={isEditEvaluationOpen} onOpenChange={setIsEditEvaluationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l'évaluation</DialogTitle>
          </DialogHeader>

          {editingEvaluation && (
            <form onSubmit={handleUpdateEvaluation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-module">Module associé</Label>
                <Input
                  id="edit-module"
                  value={editingEvaluation.module?.title || "Module inconnu"}
                  disabled
                  className="bg-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-pass-score">
                  Score de réussite (%) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-pass-score"
                  type="number"
                  min="1"
                  max="100"
                  value={editingEvaluation.pass_score}
                  onChange={(e) => setEditingEvaluation({ ...editingEvaluation, pass_score: e.target.value })}
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditEvaluationOpen(false)}
                  disabled={updateEvalLoading}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={updateEvalLoading}>
                  {updateEvalLoading ? (
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

      {/* Dialog de modification de question */}
      <Dialog open={isEditQuestionOpen} onOpenChange={setIsEditQuestionOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la question</DialogTitle>
          </DialogHeader>

          {editingQuestion && (
            <form onSubmit={handleUpdateQuestion} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-question-content">
                  Question <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="edit-question-content"
                  value={editingQuestion.content.text}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      content: {
                        ...editingQuestion.content,
                        text: e.target.value,
                      },
                    })
                  }
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    Options de réponse <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditingQuestion({
                        ...editingQuestion,
                        options: [...editingQuestion.options, ""],
                      })
                    }}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    <PlusCircle className="h-3 w-3 mr-1" />
                    Ajouter une option
                  </Button>
                </div>

                <div className="space-y-2 mt-2">
                  {editingQuestion.options.map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...editingQuestion.options]
                          newOptions[index] = e.target.value

                          // Mettre à jour la réponse correcte si elle correspond à l'option modifiée
                          let newCorrectAnswer = editingQuestion.correct_answer
                          if (editingQuestion.correct_answer === editingQuestion.options[index]) {
                            newCorrectAnswer = e.target.value
                          }

                          setEditingQuestion({
                            ...editingQuestion,
                            options: newOptions,
                            correct_answer: newCorrectAnswer,
                          })
                        }}
                        placeholder={`Option ${index + 1}`}
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => {
                          if (editingQuestion.options.length <= 2) {
                            toast({
                              title: "Action impossible",
                              description: "Une question doit avoir au moins deux options.",
                              variant: "destructive",
                            })
                            return
                          }

                          const newOptions = [...editingQuestion.options]
                          newOptions.splice(index, 1)

                          // Si l'option supprimée était la réponse correcte, réinitialiser la réponse correcte
                          let newCorrectAnswer = editingQuestion.correct_answer
                          if (editingQuestion.correct_answer === editingQuestion.options[index]) {
                            newCorrectAnswer = ""
                          }

                          setEditingQuestion({
                            ...editingQuestion,
                            options: newOptions,
                            correct_answer: newCorrectAnswer,
                          })
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Réponse correcte <span className="text-red-500">*</span>
                </Label>
                <RadioGroup
                  value={editingQuestion.correct_answer}
                  onValueChange={(value) => setEditingQuestion({ ...editingQuestion, correct_answer: value })}
                  className="space-y-2"
                >
                  {editingQuestion.options.map(
                    (option: string, index: number) =>
                      option.trim() && (
                        <div
                          key={index}
                          className="flex items-center space-x-2 rounded-md border p-3 hover:bg-muted/50"
                        >
                          <RadioGroupItem value={option} id={`edit-option-${index}`} />
                          <Label htmlFor={`edit-option-${index}`} className="flex-grow cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ),
                  )}
                </RadioGroup>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditQuestionOpen(false)}
                  disabled={updateQuestionLoading}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={
                    updateQuestionLoading ||
                    !editingQuestion.content.text ||
                    editingQuestion.options.filter((o: string) => o.trim()).length < 2 ||
                    !editingQuestion.correct_answer
                  }
                >
                  {updateQuestionLoading ? (
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
