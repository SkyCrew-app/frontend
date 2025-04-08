"use client"

import { useState, use, useEffect } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { GET_EVALUATION_BY_ID, VALIDATE_ANSWERS } from "@/graphql/evaluation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { QuestionStepper } from "@/components/evaluation/QuestionStepper"
import { EvaluationResult } from "@/components/evaluation/EvaluationResult"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import Image from "next/image"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ChevronLeft, ChevronRight, Clock, HelpCircle } from "lucide-react"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { useRouter } from "next/navigation"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Evaluation } from "@/interfaces/evaluation"

export default function EvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const evaluationId = Number.parseFloat(resolvedParams.id)
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({})
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [showWarning, setShowWarning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const isMobile = useMediaQuery("(max-width: 640px)")

  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const { data, loading, error } = useQuery(GET_EVALUATION_BY_ID, {
    variables: { id: evaluationId },
  })

  const [validateAnswers, { loading: validating }] = useMutation(VALIDATE_ANSWERS)

  const handleAnswerChange = (questionId: number, answer: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId.toString()]: answer }))
    setShowWarning(false)
  }

  const handleSubmit = async () => {
    if (Object.keys(userAnswers).length !== evaluation.questions.length) {
      setShowWarning(true)
      return
    }

    setIsSubmitting(true)

    try {
      const { data } = await validateAnswers({
        variables: {
          evaluationId,
          userId,
          userAnswers: Object.entries(userAnswers).map(([questionId, answer]) => ({
            questionId: Number.parseFloat(questionId),
            answer,
          })),
        },
      })
      setResult(data.validateAnswers)
      if (data.validateAnswers.passed) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        })
      }
    } catch (error) {
      console.error("Error validating answers:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNavigateToQuestion = (index: number) => {
    setCurrentQuestion(index)
  }

  const handleNextQuestion = () => {
    if (currentQuestion < evaluation.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      // Scroll to top on mobile
      if (isMobile) {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
      // Scroll to top on mobile
      if (isMobile) {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    }
  }

  const handleRetry = () => {
    setUserAnswers({})
    setResult(null)
    setCurrentQuestion(0)
    setShowWarning(false)
  }

  const handleContinue = () => {
    router.push("/instruction/evaluation")
  }

  if (loading)
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-[400px] w-full rounded-lg" />
          <div className="flex justify-between">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    )

  if (error)
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive" className="max-w-xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Impossible de charger l'évaluation: {error.message}
            <Button variant="outline" className="mt-4 w-full" onClick={() => router.push("/evaluations")}>
              Retour aux évaluations
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )

  const evaluation: Evaluation = data.getEvaluationById
  const remainingQuestions = evaluation.questions.length - Object.keys(userAnswers).length
  const currentQuestionData = evaluation.questions[currentQuestion]
  const isAnswered = currentQuestionData.id.toString() in userAnswers

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-4xl mx-auto shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center pb-2 sm:pb-4">
          <div className="flex items-center justify-center gap-2 text-primary text-xs mb-1">
            <Clock className="h-3 w-3" />
            <span>Évaluation</span>
          </div>
          <CardTitle className="text-xl sm:text-3xl font-bold line-clamp-2">{evaluation.module.title}</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Score minimum requis: <span className="font-medium">{evaluation.pass_score}%</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="p-3 sm:p-6">
          {!result ? (
            <>
              <div className="sticky top-0 z-10 bg-background pt-2 pb-4">
                <QuestionStepper
                  totalQuestions={evaluation.questions.length}
                  currentQuestion={currentQuestion}
                  answeredQuestions={evaluation.questions.map((q) => q.id).filter((id) => id.toString() in userAnswers)}
                  onNavigate={handleNavigateToQuestion}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4"
                >
                  <div className="bg-card rounded-lg p-4 sm:p-6 shadow-sm border">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-base sm:text-xl font-semibold">{currentQuestionData.content.text}</h3>

                      {currentQuestionData.content.explanation && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-8 sm:w-8 shrink-0 ml-2">
                                <HelpCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs">
                              <p className="text-xs">{currentQuestionData.content.explanation}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>

                    {currentQuestionData.content.image && (
                      <div className="relative w-full h-32 sm:h-48 mb-6 bg-muted/30 rounded-md overflow-hidden">
                        <Image
                          src={currentQuestionData.content.image || "/placeholder.svg"}
                          alt="Question illustration"
                          fill
                          sizes="(max-width: 640px) 100vw, 800px"
                          className="object-contain"
                        />
                      </div>
                    )}

                    <RadioGroup
                      onValueChange={(value) => handleAnswerChange(currentQuestionData.id, value)}
                      value={userAnswers[currentQuestionData.id] || ""}
                      className="space-y-2 sm:space-y-3"
                    >
                      {currentQuestionData.options.map((option, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                        >
                          <Label
                            htmlFor={`q${currentQuestionData.id}-option${index}`}
                            className={`
                              flex items-center space-x-3 p-2 sm:p-3 rounded-md 
                              ${
                                userAnswers[currentQuestionData.id] === option
                                  ? "bg-primary/10 border border-primary/30"
                                  : "bg-accent/50 hover:bg-accent border border-transparent"
                              }
                              cursor-pointer transition-all
                            `}
                          >
                            <RadioGroupItem
                              value={option}
                              id={`q${currentQuestionData.id}-option${index}`}
                              className="text-primary"
                            />
                            <span className="text-sm sm:text-base">{option}</span>
                          </Label>
                        </motion.div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="flex justify-between mt-4 sm:mt-6 gap-2">
                    <Button
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestion === 0}
                      variant="outline"
                      size={isMobile ? "sm" : "default"}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sm:inline">Précédent</span>
                    </Button>

                    {currentQuestion === evaluation.questions.length - 1 ? (
                      <Button
                        onClick={handleSubmit}
                        disabled={validating || isSubmitting}
                        size={isMobile ? "sm" : "default"}
                        className="gap-1"
                      >
                        {isSubmitting ? "Soumission..." : "Terminer"}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNextQuestion}
                        size={isMobile ? "sm" : "default"}
                        className="gap-1"
                        disabled={!isAnswered}
                      >
                        <span className="sm:inline">Suivant</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </>
          ) : (
            <EvaluationResult
              score={result.score}
              passed={result.passed}
              passScore={evaluation.pass_score}
              onRetry={handleRetry}
              onContinue={handleContinue}
            />
          )}
        </CardContent>

        {!result && (
          <CardFooter className="flex flex-col space-y-4 px-4 sm:px-6 pb-6">
            {showWarning && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Attention</AlertTitle>
                <AlertDescription>
                  Veuillez répondre à toutes les questions avant de soumettre l'évaluation. Il reste{" "}
                  {remainingQuestions} question{remainingQuestions > 1 ? "s" : ""} sans réponse.
                </AlertDescription>
              </Alert>
            )}

            {currentQuestion === evaluation.questions.length - 1 && (
              <Button
                onClick={handleSubmit}
                disabled={validating || isSubmitting || Object.keys(userAnswers).length !== evaluation.questions.length}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? "Soumission en cours..." : "Soumettre toutes les réponses"}
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
