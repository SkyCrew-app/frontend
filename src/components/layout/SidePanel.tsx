"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export interface SidePanelStep {
  title: string
  /** One line under the step title, optional. */
  description?: string
  content: ReactNode
  /** Called before leaving the step forwards; return false to stay on it. */
  validate?: () => boolean | Promise<boolean>
}

const SIZES = {
  md: "sm:max-w-md",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-3xl",
}

interface SidePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  /** Content of a panel without steps. */
  children?: ReactNode
  /** A long form is split into steps so that no step needs scrolling. */
  steps?: SidePanelStep[]
  /** Makes the panel a form: the last button submits it. */
  onSubmit?: () => void | Promise<void>
  submitLabel?: string
  submitting?: boolean
  submitDisabled?: boolean
  cancelLabel?: string
  /** Replaces the default buttons, for a panel that only shows information. */
  footer?: ReactNode
  /** Shown on the left of the buttons, e.g. a delete button. */
  footerStart?: ReactNode
  size?: keyof typeof SIZES
}

/**
 * The panel that slides in from the right for creating, editing or viewing an item.
 * Used instead of a centred dialog: it has the full height of the screen, and long
 * forms go through steps instead of a scrolling list of fields.
 */
export function SidePanel({
  open,
  onOpenChange,
  title,
  description,
  children,
  steps,
  onSubmit,
  submitLabel = "Enregistrer",
  submitting = false,
  submitDisabled = false,
  cancelLabel = "Annuler",
  footer,
  footerStart,
  size = "lg",
}: SidePanelProps) {
  const [current, setCurrent] = useState(0)
  const [checking, setChecking] = useState(false)
  const stepCount = steps?.length ?? 0
  const hasSteps = stepCount > 1
  const isLast = !hasSteps || current === stepCount - 1

  // Always start on the first step.
  useEffect(() => {
    if (open) setCurrent(0)
  }, [open])

  const goNext = async () => {
    const validate = steps?.[current]?.validate
    if (validate) {
      setChecking(true)
      try {
        if (!(await validate())) return
      } finally {
        setChecking(false)
      }
    }
    setCurrent((step) => Math.min(step + 1, stepCount - 1))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!isLast) {
      await goNext()
      return
    }
    const validate = steps?.[current]?.validate
    if (validate && !(await validate())) return
    await onSubmit?.()
  }

  const body = (
    <>
      {hasSteps && steps && (
        <ol className="flex items-center gap-2 border-b px-6 py-3" aria-label="Étapes">
          {steps.map((step, index) => {
            const done = index < current
            const active = index === current
            return (
              <li key={step.title} className={cn("flex items-center gap-2", index < stepCount - 1 && "flex-1")}>
                <button
                  type="button"
                  // Going back is always allowed; going forward goes through the checks of each step.
                  disabled={index > current}
                  onClick={() => setCurrent(index)}
                  aria-current={active ? "step" : undefined}
                  className="flex min-w-0 items-center gap-2 rounded-md text-left text-sm disabled:cursor-default"
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                      active && "bg-primary text-primary-foreground",
                      done && "bg-success/15 text-success",
                      !active && !done && "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      "truncate",
                      active ? "font-medium text-foreground" : "hidden text-muted-foreground md:inline",
                    )}
                  >
                    {step.title}
                  </span>
                </button>
                {index < stepCount - 1 && <span className="h-px min-w-3 flex-1 bg-border" aria-hidden="true" />}
              </li>
            )
          })}
        </ol>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {steps
          ? steps.map((step, index) => (
              // Every step stays mounted so that fields keep their value; only the current one shows.
              <div key={step.title} hidden={index !== current} className="space-y-4">
                {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
                {step.content}
              </div>
            ))
          : children}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t px-6 py-4">
        {footerStart}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {footer ?? (
            <>
              {hasSteps && current > 0 ? (
                <Button type="button" variant="outline" onClick={() => setCurrent((step) => step - 1)}>
                  <ArrowLeft className="h-4 w-4" />
                  Précédent
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {onSubmit ? cancelLabel : "Fermer"}
                </Button>
              )}
              {!isLast && (
                <Button type="submit" disabled={checking}>
                  Suivant
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {isLast && onSubmit && (
                <Button type="submit" disabled={submitting || submitDisabled || checking}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitLabel}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn("flex h-full w-full flex-col gap-0 p-0", SIZES[size])}>
        <SheetHeader className="space-y-1 border-b px-6 py-4 pr-12 text-left">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : (
            <SheetDescription className="sr-only">{title}</SheetDescription>
          )}
        </SheetHeader>
        {onSubmit || hasSteps ? (
          <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
            {body}
          </form>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">{body}</div>
        )}
      </SheetContent>
    </Sheet>
  )
}
