"use client"

import { motion } from "framer-motion"
import { Sparkles, Trophy, XCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface EvaluationResultProps {
  score: number
  passed: boolean
  passScore: number
  onRetry: () => void
  onContinue?: () => void
}

export function EvaluationResult({ score, passed, passScore, onRetry, onContinue }: EvaluationResultProps) {
  return (
    <Card className="overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        className={`p-4 sm:p-8 rounded-lg ${
          passed
            ? "bg-gradient-to-br from-success/20 to-success/5"
            : "bg-gradient-to-br from-destructive/20 to-destructive/5"
        }`}
      >
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative"
          >
            <div
              className={`absolute inset-0 rounded-full ${passed ? "bg-success/10" : "bg-destructive/10"} blur-xl`}
            ></div>
            {passed ? (
              <Trophy className="w-16 h-16 sm:w-24 sm:h-24 text-success relative z-10" />
            ) : (
              <XCircle className="w-16 h-16 sm:w-24 sm:h-24 text-destructive relative z-10" />
            )}
          </motion.div>

          <h3 className="text-xl sm:text-2xl font-bold mt-4 mb-2">
            {passed ? "Félicitations !" : "Pas tout à fait..."}
          </h3>

          <p className="text-sm sm:text-lg mb-4 max-w-md">
            {passed
              ? "Vous avez réussi cette évaluation avec succès."
              : `Vous n'avez pas atteint le score minimum requis pour cette évaluation.`}
          </p>

          <div className="w-full max-w-xs mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Votre score</span>
              <span>Minimum requis: {passScore}%</span>
            </div>
            <div className="h-8 w-full bg-muted rounded-full overflow-hidden flex items-center">
              <div
                className={`h-full ${passed ? "bg-green-500" : "bg-red-500"} rounded-full flex items-center justify-center`}
                style={{ width: `${score}%` }}
              >
                <span className="px-2 text-sm font-bold text-white">{score}%</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full max-w-xs">
            {passed ? (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -z-10 opacity-20"
                >
                  <Sparkles className="w-8 h-8 text-yellow-400" />
                </motion.div>
                <Button onClick={onContinue} className="w-full" size="lg">
                  Continuer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button onClick={onRetry} variant="outline" className="w-full">
                  Réessayer
                </Button>
                <Button onClick={onContinue} variant="secondary" className="w-full">
                  Revenir aux cours
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </Card>
  )
}
