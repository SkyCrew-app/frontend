import { motion } from 'framer-motion'
import { Sparkles, Trophy, XCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface EvaluationResultProps {
  score: number
  passed: boolean
  passScore: number
  onRetry: () => void
}

export function EvaluationResult({ score, passed, passScore, onRetry }: EvaluationResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.5 }}
      className={`mt-8 p-8 rounded-lg ${
        passed ? 'bg-success/10' : 'bg-destructive/10'
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          {passed ? (
            <Trophy className="w-24 h-24 text-success mb-4" />
          ) : (
            <XCircle className="w-24 h-24 text-destructive mb-4" />
          )}
        </motion.div>
        <h3 className="text-2xl font-bold mb-2">
          {passed ? 'Félicitations !' : 'Pas tout à fait...'}
        </h3>
        <p className="text-lg mb-4">
          {passed
            ? 'Vous avez réussi cette évaluation.'
            : `Vous n'avez pas atteint le score minimum requis.`}
        </p>
        <motion.div
          className="text-4xl font-bold mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
        >
          {score}%
        </motion.div>
        <p className="text-sm text-muted-foreground mb-6">
          Score minimum requis : {passScore}%
        </p>
        {passed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Sparkles className="w-8 h-8 text-yellow-400" />
          </motion.div>
        ) : (
          <Button onClick={onRetry} variant="outline">
            Réessayer
          </Button>
        )}
      </div>
    </motion.div>
  )
}
