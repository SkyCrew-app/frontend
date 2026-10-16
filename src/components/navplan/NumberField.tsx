"use client"

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type NativeProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">

interface NumberFieldProps extends NativeProps {
  /** Value in the unit shown (already converted by the caller). */
  value: number | null | undefined
  onValueChange: (value: number | null) => void
  unit?: string
  /** Digits kept when the value comes from outside (a conversion, a "full" button). */
  digits?: number
  invalid?: boolean
}

const parse = (text: string): number | null => {
  const normalized = text.replace(/\s/g, "").replace(",", ".")
  if (normalized === "" || normalized === "-") return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

const show = (value: number | null | undefined, digits: number) =>
  value === null || value === undefined || !Number.isFinite(value) ? "" : String(Math.round(value * 10 ** digits) / 10 ** digits)

/**
 * A number input that keeps what the member types ("0,4" while typing "0,41") and accepts a
 * comma or a point; the value is re-shown only when it changes from outside.
 */
export function NumberField({ value, onValueChange, unit, digits = 2, invalid, className, ...props }: NumberFieldProps) {
  const [text, setText] = useState(() => show(value, digits))
  const lastEmitted = useRef<number | null | undefined>(value)

  useEffect(() => {
    if (value === lastEmitted.current) return
    lastEmitted.current = value
    setText(show(value, digits))
  }, [value, digits])

  return (
    <div className="relative">
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        aria-invalid={invalid || undefined}
        className={cn("tabular-nums", unit && "pr-12", invalid && "border-destructive", className)}
        onChange={(event) => {
          setText(event.target.value)
          const parsed = parse(event.target.value)
          lastEmitted.current = parsed
          onValueChange(parsed)
        }}
      />
      {unit && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground" aria-hidden="true">
          {unit}
        </span>
      )}
    </div>
  )
}
