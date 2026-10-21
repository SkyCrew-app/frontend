"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface SettingsSectionProps {
  title: string
  description?: string
  /** Shown on the right of the title, e.g. the button adding an item. */
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/** A titled group of settings: every tab is made of these. */
export function SettingsSection({ title, description, action, className, children }: SettingsSectionProps) {
  return (
    <Card className={className}>
      {/* With a description, the action goes under the text when the card is too narrow for both. */}
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-x-4 gap-y-3 space-y-0">
        <div className={cn("min-w-0 flex-1 space-y-1.5", description && "basis-64")}>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

interface SettingsFieldProps {
  /** Id of the input the label points to. */
  id: string
  label: string
  required?: boolean
  hint?: string
  error?: string
  className?: string
  children: React.ReactNode
}

/** Label above the field, helper text and validation message below it. */
export function SettingsField({ id, label, required, hint, error, className, children }: SettingsFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </Label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

interface UnitInputProps extends React.ComponentProps<typeof Input> {
  unit: string
}

/** Number input with its unit shown inside the field. */
export const UnitInput = React.forwardRef<HTMLInputElement, UnitInputProps>(({ unit, className, ...props }, ref) => (
  <div className="relative">
    <Input ref={ref} type="number" inputMode="decimal" className={cn("pr-14 tabular-nums", className)} {...props} />
    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
      {unit}
    </span>
  </div>
))
UnitInput.displayName = "UnitInput"

/** Message of a react-hook-form field error, if any. */
export const errorMessage = (error: unknown): string | undefined => {
  const message = (error as { message?: unknown } | undefined)?.message
  return typeof message === "string" ? message : undefined
}
