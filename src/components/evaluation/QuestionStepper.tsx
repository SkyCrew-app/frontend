"use client"

import React from "react"
import { motion } from "framer-motion"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

interface QuestionStepperProps {
  totalQuestions: number
  currentQuestion: number
  answeredQuestions: number[]
  onNavigate?: (index: number) => void
}

export function QuestionStepper({
  totalQuestions,
  currentQuestion,
  answeredQuestions,
  onNavigate,
}: QuestionStepperProps) {
  const isMobile = useMediaQuery("(max-width: 640px)")
  const progressPercentage = ((currentQuestion + 1) / totalQuestions) * 100

  return (
    <div className="mb-6 px-2">
      {/* Question navigation */}
      <div className="mb-6">
        {isMobile ? (
          <MobileQuestionStepper
            totalQuestions={totalQuestions}
            currentQuestion={currentQuestion}
            answeredQuestions={answeredQuestions}
            onNavigate={onNavigate}
          />
        ) : (
          <DesktopQuestionStepper
            totalQuestions={totalQuestions}
            currentQuestion={currentQuestion}
            answeredQuestions={answeredQuestions}
            onNavigate={onNavigate}
          />
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.3 }}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Progress stats */}
      <div className="mt-3 flex justify-between items-center text-xs text-muted-foreground px-4">
        <div>
          Question {currentQuestion + 1} sur {totalQuestions}
        </div>
        <div>
          {answeredQuestions.length} répondue{answeredQuestions.length > 1 ? "s" : ""}
        </div>
      </div>
    </div>
  )
}

function MobileQuestionStepper({
  totalQuestions,
  currentQuestion,
  answeredQuestions,
  onNavigate,
}: QuestionStepperProps) {
  return (
    <div className="flex items-center justify-between px-4">
      <button
        onClick={() => onNavigate?.(Math.max(0, currentQuestion - 1))}
        disabled={currentQuestion === 0}
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-full",
          "transition-colors duration-200",
          currentQuestion === 0
            ? "text-muted-foreground bg-muted cursor-not-allowed"
            : "text-primary bg-primary/10 hover:bg-primary/20",
        )}
        aria-label="Question précédente"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex flex-col items-center">
        <div className="text-2xl font-bold text-primary">{currentQuestion + 1}</div>
        <div className="text-xs text-muted-foreground">sur {totalQuestions}</div>
      </div>

      <button
        onClick={() => onNavigate?.(Math.min(totalQuestions - 1, currentQuestion + 1))}
        disabled={currentQuestion === totalQuestions - 1}
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-full",
          "transition-colors duration-200",
          currentQuestion === totalQuestions - 1
            ? "text-muted-foreground bg-muted cursor-not-allowed"
            : "text-primary bg-primary/10 hover:bg-primary/20",
        )}
        aria-label="Question suivante"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function DesktopQuestionStepper({
  totalQuestions,
  currentQuestion,
  answeredQuestions,
  onNavigate,
}: QuestionStepperProps) {
  return (
    <div className="px-6">
      {/* Question bubbles */}
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {Array.from({ length: totalQuestions }).map((_, index) => {
          const isAnswered = answeredQuestions.includes(index)
          const isCurrent = index === currentQuestion
          const isPast = index < currentQuestion

          return (
            <React.Fragment key={`question-${index}`}>
              {/* Connector line */}
              {index > 0 && (
                <div className="flex-1 h-0.5 bg-muted relative mx-1">
                  <motion.div
                    className="absolute inset-0 bg-primary origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isPast ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}

              {/* Question bubble */}
              <motion.button
                onClick={() => onNavigate?.(index)}
                className={cn(
                  "relative flex items-center justify-center rounded-full",
                  "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                  isCurrent
                    ? "w-10 h-10 bg-primary text-primary-foreground shadow-md z-10"
                    : isAnswered
                      ? "w-8 h-8 bg-green-500/20 text-green-600 hover:bg-green-500/30"
                      : isPast
                        ? "w-8 h-8 bg-primary/20 text-primary hover:bg-primary/30"
                        : "w-8 h-8 bg-muted text-muted-foreground hover:bg-muted/80",
                )}
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                }}
                whileHover={{ scale: isCurrent ? 1.1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                aria-label={`Question ${index + 1}`}
              >
                {isPast && isAnswered ? (
                  <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                ) : (
                  <span className="text-xs sm:text-sm font-medium">{index + 1}</span>
                )}

                {/* Status indicator */}
                {!isCurrent && isAnswered && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </motion.button>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
