"use client"

import { useEffect, useRef, useState } from "react"

/** Width of the element, followed on resize (a chart drawn at its real size keeps its text legible). */
export function useElementWidth<T extends HTMLElement>(initial: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(initial)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    setWidth(element.clientWidth || initial)
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width) || initial))
    observer.observe(element)
    return () => observer.disconnect()
  }, [initial])
  return [ref, width] as const
}
