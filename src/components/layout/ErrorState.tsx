import type { ReactNode } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  title?: ReactNode
  description?: ReactNode
  onRetry?: () => void
}

/** What a page or section shows when its data could not be loaded. */
export function ErrorState({
  title = "Chargement impossible",
  description = "Les données n'ont pas pu être chargées. Vérifiez votre connexion puis réessayez.",
  onRetry,
}: ErrorStateProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>{description}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
