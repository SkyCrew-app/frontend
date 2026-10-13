"use client"

import Link from "next/link"
import { useQuery } from "@apollo/client"
import { Newspaper } from "lucide-react"
import { useTranslation } from "react-i18next"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { getBackendBaseUrl } from "@/lib/runtime-config"
import { GET_ARTICLES } from "@/graphql/articles"
import { WIDGET_REGISTRY } from "@/interfaces/dashboard"
import { Skeleton } from "@/components/ui/skeleton"
import WidgetContainer, { WidgetEmpty, WidgetError, WidgetLink } from "../WidgetContainer"

const MAX_ARTICLES = 3

interface ArticlesWidgetProps {
  /** True when the widget spans two columns: articles sit side by side. */
  wide?: boolean
}

export default function ArticlesWidget({ wide = false }: ArticlesWidgetProps) {
  const { t } = useTranslation("dashboard")
  const { data, loading, error, refetch } = useQuery(GET_ARTICLES)

  const articles: any[] = data?.articles || []
  const latest = [...articles]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_ARTICLES)
  // Pictures are shown only when at least one article has one: no stand-in images.
  const showPictures = latest.some((article) => article.photo_url)
  const layout = wide ? "grid gap-4 sm:grid-cols-3" : "flex flex-col gap-4"

  const renderContent = () => {
    if (loading) {
      return (
        <div className={layout} aria-hidden="true">
          {Array.from({ length: MAX_ARTICLES }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      )
    }
    if (error && articles.length === 0) return <WidgetError onRetry={() => refetch()} />
    if (latest.length === 0) {
      return (
        <WidgetEmpty
          icon={Newspaper}
          title={t("articles.emptyTitle")}
          description={t("articles.emptyDescription")}
        />
      )
    }

    return (
      <div className={layout}>
        {latest.map((article) => (
          <Link
            key={article.id}
            href={`/articles/${article.id}`}
            className={cn(
              "group -m-2 flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              wide && "flex-col",
            )}
          >
            {showPictures &&
              (article.photo_url ? (
                <img
                  src={`${getBackendBaseUrl()}${article.photo_url}`}
                  alt={article.title}
                  loading="lazy"
                  className={cn("rounded-lg object-cover", wide ? "aspect-video w-full" : "h-16 w-24 shrink-0")}
                />
              ) : (
                <div
                  className={cn(
                    "flex items-center justify-center rounded-lg bg-muted text-muted-foreground",
                    wide ? "aspect-video w-full" : "h-16 w-24 shrink-0",
                  )}
                  aria-hidden="true"
                >
                  <Newspaper className="h-5 w-5" />
                </div>
              ))}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{formatDate(article.createdAt)}</p>
              <p className="mt-0.5 line-clamp-2 text-sm font-medium group-hover:underline">{article.title}</p>
              {article.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{article.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    )
  }

  return (
    <WidgetContainer
      title={WIDGET_REGISTRY["articles"].label}
      action={<WidgetLink href="/articles">{t("common:actions.seeAll")}</WidgetLink>}
    >
      {renderContent()}
    </WidgetContainer>
  )
}
