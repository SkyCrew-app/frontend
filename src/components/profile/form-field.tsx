import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  /** Id of the input the label points to. */
  id: string
  label: string
  required?: boolean
  hint?: ReactNode
  error?: string
  className?: string
  children: ReactNode
}

/** One field of the profile forms: label above, input, then hint or validation message. */
export function FormField({ id, label, required, hint, error, className, children }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        {required && (
          <span className="text-sm text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </div>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
