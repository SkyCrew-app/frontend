"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ArrowRight, Calendar, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/format"
import i18n from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { ArticleImage } from "./article-image"

interface Article {
  id: string
  title: string
  description: string
  text: string
  tags: string[]
  photo_url: string | null
  createdAt: string
  eventDate: string | null
}

interface ArticleCardProps {
  article: Article
  viewMode: "grid" | "list"
}

const MAX_TAGS = 3

// The club's themes are stored in French: the stored value stays, only its label follows the language.
const TAG_KEYS: Record<string, string> = {
  Actualités: "news",
  Événements: "events",
  Formation: "training",
  Réglementation: "regulation",
  Sécurité: "safety",
  Technique: "technical",
  Information: "information",
}

export const articleTagLabel = (tag: string): string =>
  Object.prototype.hasOwnProperty.call(TAG_KEYS, tag)
    ? i18n.t(`articles:tags.${TAG_KEYS[tag]}`, { defaultValue: tag })
    : tag

/** One article in the news list. Same anatomy in both views: picture, date, title, summary, tags. */
export function ArticleCard({ article, viewMode }: ArticleCardProps) {
  const { t } = useTranslation("articles")
  const isList = viewMode === "list"
  const tags = article.tags ?? []

  return (
    <Link
      href={`/articles/${article.id}`}
      className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card
        className={cn(
          "flex h-full overflow-hidden transition-shadow hover:shadow-md",
          isList ? "flex-col sm:flex-row" : "flex-col",
        )}
      >
        <ArticleImage
          src={article.photo_url}
          alt=""
          className={cn("aspect-video w-full shrink-0", isList && "sm:aspect-[4/3] sm:w-56")}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            {article.eventDate ? (
              <>
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {t("card.eventOn", { date: formatDate(article.eventDate) })}
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {t("shared.publishedOn", { date: formatDate(article.createdAt) })}
              </>
            )}
          </p>

          <h2 className="line-clamp-2 text-lg font-semibold leading-tight tracking-tight">{article.title}</h2>
          <p className={cn("text-sm text-muted-foreground", isList ? "line-clamp-2" : "line-clamp-3")}>
            {article.description}
          </p>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, MAX_TAGS).map((tag) => (
                <Badge key={tag} variant="secondary">
                  {articleTagLabel(tag)}
                </Badge>
              ))}
              {tags.length > MAX_TAGS && <Badge variant="outline">+{tags.length - MAX_TAGS}</Badge>}
            </div>
            <span className="ml-auto inline-flex items-center gap-2 text-sm font-medium text-primary group-hover:underline">
              {t("card.read")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
