import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

const TOKENS = [
  "foreground",
  "muted-foreground",
  "border",
  "card",
  "success",
  "warning",
  "info",
  "destructive",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-6",
] as const

export type ThemeColors = Record<(typeof TOKENS)[number], string>

const read = (): ThemeColors => {
  const style = getComputedStyle(document.documentElement)
  return Object.fromEntries(
    TOKENS.map((token) => [token, `hsl(${style.getPropertyValue(`--${token}`).trim().replace(/ /g, ", ")})`]),
  ) as ThemeColors
}

// Theme colours as plain values, for charts drawn on a canvas, which cannot
// read CSS variables. Recomputed when the user switches theme.
export function useThemeColors(): ThemeColors | null {
  const { resolvedTheme } = useTheme()
  const [colors, setColors] = useState<ThemeColors | null>(null)

  useEffect(() => {
    setColors(read())
  }, [resolvedTheme])

  return colors
}
