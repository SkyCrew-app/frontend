import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface QuestionStepperProps {
  totalQuestions: number
  currentQuestion: number
  answeredQuestions: number[]
}

export function QuestionStepper({ totalQuestions, currentQuestion, answeredQuestions }: QuestionStepperProps) {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center">
        {Array.from({ length: totalQuestions }).map((_, index) => (
          <motion.div
            key={index}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${
                index === currentQuestion
                  ? 'bg-primary text-primary-foreground'
                  : index < currentQuestion
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }
            `}
            initial={false}
            animate={{
              scale: index === currentQuestion ? 1.2 : 1,
            }}
            transition={{ duration: 0.3 }}
          >
            {index < currentQuestion ? (
              <Check className="w-4 h-4" />
            ) : (
              <span>{index + 1}</span>
            )}
          </motion.div>
        ))}
      </div>
      <div className="mt-4 text-center text-sm font-medium text-primary">
        Question {currentQuestion + 1} sur {totalQuestions}
      </div>
      <div className="mt-2 text-center text-xs text-muted-foreground">
        {answeredQuestions.length} question{answeredQuestions.length > 1 ? 's' : ''} répondue{answeredQuestions.length > 1 ? 's' : ''}
      </div>
    </div>
  )
}

