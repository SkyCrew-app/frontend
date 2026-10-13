import i18n from "@/lib/i18n"
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
  title = i18n.t("common:states.errorTitle"),
  description = i18n.t("common:states.errorDescription"),
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
            {i18n.t("common:actions.retry")}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
