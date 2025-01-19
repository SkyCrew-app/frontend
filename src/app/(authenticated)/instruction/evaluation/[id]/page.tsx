'use client'

import { useState, use } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { GET_EVALUATION_BY_ID, VALIDATE_ANSWERS } from '@/graphql/evaluation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { QuestionStepper } from "@/components/evaluation/QuestionStepper"
import { EvaluationResult } from "@/components/evaluation/EvaluationResult"
import { motion, AnimatePresence } from "framer-motion"
import confetti from 'canvas-confetti'
import Image from 'next/image'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from 'lucide-react'

export interface Question {
  id: number;
  content: {
    text: string;
    image?: string;
    explanation?: string;
  };
  options: string[];
  correct_answer: string;
}

export interface Evaluation {
  id: number;
  module: {
    id: number;
    title: string;
  };
  pass_score: number;
  questions: Question[];
}

export default function EvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const evaluationId = parseFloat(resolvedParams.id)
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({})
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [showWarning, setShowWarning] = useState(false)

  const { data, loading, error } = useQuery(GET_EVALUATION_BY_ID, {
    variables: { id: evaluationId },
  })

  const [validateAnswers, { loading: validating }] = useMutation(VALIDATE_ANSWERS)

  const handleAnswerChange = (questionId: number, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId.toString()]: answer }))
    setShowWarning(false)
  }

  const handleSubmit = async () => {
    if (Object.keys(userAnswers).length !== evaluation.questions.length) {
      setShowWarning(true)
      return
    }

    try {
      const { data } = await validateAnswers({
        variables: {
          evaluationId,
          userId: 2, // TODO: Replace with actual user ID
          userAnswers: Object.entries(userAnswers).map(([questionId, answer]) => ({
            questionId: parseFloat(questionId),
            answer,
          })),
        },
      })
      setResult(data.validateAnswers)
      if (data.validateAnswers.passed) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        })
      }
    } catch (error) {
      console.error('Error validating answers:', error)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestion < evaluation.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleRetry = () => {
    setUserAnswers({})
    setResult(null)
    setCurrentQuestion(0)
    setShowWarning(false)
  }

  if (loading) return <Skeleton className="w-full h-[400px]" />
  if (error) return <p className="text-destructive">Error: {error.message}</p>

  const evaluation: Evaluation = data.getEvaluationById
  const progress = (Object.keys(userAnswers).length / evaluation.questions.length) * 100
  const remainingQuestions = evaluation.questions.length - Object.keys(userAnswers).length

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-4xl mx-auto shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl sm:text-3xl font-bold">{evaluation.module.title} - Évaluation</CardTitle>
          <CardDescription className="text-lg">Score de passage : {evaluation.pass_score}%</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {!result && (
            <>
              <QuestionStepper
                totalQuestions={evaluation.questions.length}
                currentQuestion={currentQuestion}
                answeredQuestions={evaluation.questions.map(q => q.id).filter(id => id.toString() in userAnswers)}
              />
              <Progress value={progress} className="mb-6" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="bg-card/50 rounded-lg p-6 shadow-sm">
                    <h3 className="text-xl font-semibold mb-4">
                      Question {currentQuestion + 1}: {evaluation.questions[currentQuestion].content.text}
                    </h3>
                    {evaluation.questions[currentQuestion].content.image && (
                      <div className="relative w-full h-48 mb-6">
                        <Image
                          src={evaluation.questions[currentQuestion].content.image}
                          alt="Question illustration"
                          layout="fill"
                          objectFit="contain"
                          className="rounded-md"
                        />
                      </div>
                    )}
                    <RadioGroup
                      onValueChange={(value) => handleAnswerChange(evaluation.questions[currentQuestion].id, value)}
                      value={userAnswers[evaluation.questions[currentQuestion].id] || ''}
                      className="space-y-3"
                    >
                      {evaluation.questions[currentQuestion].options.map((option, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          <Label
                            htmlFor={`q${evaluation.questions[currentQuestion].id}-option${index}`}
                            className="flex items-center space-x-3 p-3 rounded-md bg-accent/50 hover:bg-accent cursor-pointer transition-colors"
                          >
                            <RadioGroupItem
                              value={option}
                              id={`q${evaluation.questions[currentQuestion].id}-option${index}`}
                            />
                            <span className="text-sm sm:text-base">{option}</span>
                          </Label>
                        </motion.div>
                      ))}
                    </RadioGroup>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="flex justify-between mt-6">
                <Button onClick={handlePreviousQuestion} disabled={currentQuestion === 0} variant="outline">
                  Précédent
                </Button>
                <Button onClick={handleNextQuestion} disabled={currentQuestion === evaluation.questions.length - 1}>
                  Suivant
                </Button>
              </div>
            </>
          )}
          {result && (
            <EvaluationResult
              score={result.score}
              passed={result.passed}
              passScore={evaluation.pass_score}
              onRetry={handleRetry}
            />
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          {!result && (
            <>
              <p className="text-sm text-muted-foreground text-center">
                {Object.keys(userAnswers).length} sur {evaluation.questions.length} questions répondues
              </p>
              {showWarning && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Attention</AlertTitle>
                  <AlertDescription>
                    Veuillez répondre à toutes les questions avant de soumettre l'évaluation.
                    Il reste {remainingQuestions} question{remainingQuestions > 1 ? 's' : ''} sans réponse.
                  </AlertDescription>
                </Alert>
              )}
              <Button
                onClick={handleSubmit}
                disabled={validating || Object.keys(userAnswers).length !== evaluation.questions.length}
                className="w-full"
              >
                {validating ? 'Soumission...' : 'Soumettre les réponses'}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
