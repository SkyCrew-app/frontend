"use client"

import { useState } from "react"
import { Newspaper } from "lucide-react"
import { getBackendBaseUrl } from "@/lib/runtime-config"
import { cn } from "@/lib/utils"

// Files uploaded with an article are served by the API: turn their path into a full address.
export const articleFileUrl = (path: string | null | undefined): string | null => {
  if (!path) return null
  if (/^(https?:|data:|blob:)/.test(path)) return path
  return `${getBackendBaseUrl()}${path.startsWith("/") ? "" : "/"}${path}`
}

// "/uploads/articles/1728-programme.pdf" becomes "1728-programme.pdf"
export const articleFileName = (path: string): string => {
  const name = path.split(/[?#]/)[0].split("/").filter(Boolean).pop() ?? path
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

interface ArticleImageProps {
  src: string | null | undefined
  /** Empty when the image only repeats the title shown next to it. */
  alt: string
  /** Sets the size and ratio of the block, e.g. "aspect-video". */
  className?: string
  iconClassName?: string
}

/**
 * The picture of an article. Without a picture (or when it fails to load) the same
 * block is kept, tinted, with an icon: lists stay aligned and nothing looks broken.
 */
export function ArticleImage({ src, alt, className, iconClassName }: ArticleImageProps) {
  const url = articleFileUrl(src)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (!url || failedUrl === url) {
    return (
      <div
        className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}
        data-testid="article-image-fallback"
        aria-hidden="true"
      >
        <Newspaper className={cn("h-8 w-8 opacity-60", iconClassName)} />
      </div>
    )
  }

  return (
    <div className={cn("overflow-hidden bg-muted", className)}>
      {/* Uploaded files come from the API host, which next/image is not configured for. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover"
        onError={() => setFailedUrl(url)}
      />
    </div>
  )
}
