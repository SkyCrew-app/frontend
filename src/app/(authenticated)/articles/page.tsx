"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@apollo/client"
import { LayoutGrid, List, Newspaper, Search, SearchX, Tag, X } from "lucide-react"
import { GET_ARTICLES } from "@/graphql/articles"
import { ArticleCard } from "@/components/articles/article-card"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

type SortOrder = "newest" | "oldest"
type ViewMode = "grid" | "list"

export default function ArticlesPage() {
  const { loading, error, data, refetch } = useQuery(GET_ARTICLES)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")

  const articles: Article[] = useMemo(() => data?.articles ?? [], [data])

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    articles.forEach((article) => article.tags?.forEach((tag) => tags.add(tag)))
    return Array.from(tags).sort((a, b) => a.localeCompare(b, "fr"))
  }, [articles])

  const filteredArticles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return articles
      .filter((article) => {
        const matchesSearch =
          term === "" ||
          article.title.toLowerCase().includes(term) ||
          article.description.toLowerCase().includes(term)
        const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => article.tags?.includes(tag))
        return matchesSearch && matchesTags
      })
      .sort((a, b) => {
        const dateA = new Date(a.eventDate || a.createdAt).getTime()
        const dateB = new Date(b.eventDate || b.createdAt).getTime()
        return sortOrder === "newest" ? dateB - dateA : dateA - dateB
      })
  }, [articles, searchTerm, selectedTags, sortOrder])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const clearFilters = () => {
    setSelectedTags([])
    setSearchTerm("")
  }

  const hasFilters = selectedTags.length > 0 || searchTerm.trim() !== ""
  const gridClass =
    viewMode === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-4"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Actualités"
        description="Les nouvelles et les événements de l'aéroclub."
        className="mb-0"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Rechercher un article"
            placeholder="Rechercher un article…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {allTags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Tag className="h-4 w-4" />
                  Thèmes
                  {selectedTags.length > 0 && <Badge variant="secondary">{selectedTags.length}</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
                {allTags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag}
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={() => toggleTag(tag)}
                    // Several themes can be ticked without reopening the menu.
                    onSelect={(e) => e.preventDefault()}
                  >
                    {tag}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
            <SelectTrigger className="w-auto min-w-[10rem]" aria-label="Ordre d'affichage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Plus récents d'abord</SelectItem>
              <SelectItem value="oldest">Plus anciens d'abord</SelectItem>
            </SelectContent>
          </Select>

          {/* On a phone both views are a single column: the switch would change nothing. */}
          <div className="hidden items-center gap-1 sm:flex" role="group" aria-label="Affichage">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              aria-label="Afficher en grille"
              aria-pressed={viewMode === "grid"}
              title="Afficher en grille"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              aria-label="Afficher en liste"
              aria-pressed={viewMode === "list"}
              title="Afficher en liste"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Thèmes choisis :</span>
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => toggleTag(tag)}
                aria-label={`Retirer le thème ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Tout effacer
          </Button>
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Chargement des articles">
          {Array.from({ length: 6 }, (_, index) => (
            <Card key={index} className="overflow-hidden">
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : articles.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Aucun article pour le moment"
          description="Les actualités de l'aéroclub s'afficheront ici dès leur publication."
        />
      ) : filteredArticles.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Aucun article ne correspond"
          description="Modifiez votre recherche ou retirez des thèmes."
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Effacer la recherche
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className={gridClass}>
          {filteredArticles.map((article) => (
            <ArticleCard key={article.id} article={article} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  )
}
