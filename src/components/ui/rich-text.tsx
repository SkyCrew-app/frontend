"use client"

import { useEffect, useState } from "react"
import { sanitizeRichText } from "@/lib/sanitize-html"

interface RichTextProps {
  html: string | null | undefined
  className?: string
}

// The one place where authored HTML (article, lesson) enters the page. It
// is filtered in the browser, once mounted: nothing is rendered before.
export function RichText({ html, className }: RichTextProps) {
  const [safeHtml, setSafeHtml] = useState("")

  useEffect(() => {
    setSafeHtml(sanitizeRichText(html))
  }, [html])

  return <div className={className} dangerouslySetInnerHTML={{ __html: safeHtml }} />
}
