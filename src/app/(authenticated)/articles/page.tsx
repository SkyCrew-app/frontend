"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@apollo/client"
import { motion } from "framer-motion"
import { Newspaper, Filter, Search, Calendar, Tag, ArrowUpDown, Loader2 } from "lucide-react"
import { GET_ARTICLES } from "@/graphql/articles"
import { ArticleCard } from "@/components/articles/article-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslations } from "next-intl"

interface Article {
  id: string
  title: string
  description: string
  text: string
  tags: string[]
  photo_url: string
  createdAt: string
  eventDate: string | null
}

export default function ArticlesPage() {
  const { loading, error, data } = useQuery(GET_ARTICLES)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [allTags, setAllTags] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const t = useTranslations('articles');

  useEffect(() => {
    if (data?.articles) {
      const tags = new Set<string>()
      data.articles.forEach((article: Article) => {
        article.tags?.forEach((tag: string) => tags.add(tag))
      })
      setAllTags(Array.from(tags).sort())
    }
  }, [data])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const clearFilters = () => {
    setSelectedTags([])
    setSearchTerm("")
    setSortOrder("newest")
  }

  const filteredArticles = data?.articles
    ? data.articles
        .filter((article: Article) => {
          const matchesSearch =
            searchTerm === "" ||
            article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            article.description.toLowerCase().includes(searchTerm.toLowerCase())

          const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => article.tags?.includes(tag))

          return matchesSearch && matchesTags
        })
        .sort((a: Article, b: Article) => {
          const dateA = new Date(a.eventDate || a.createdAt).getTime()
          const dateB = new Date(b.eventDate || b.createdAt).getTime()
          return sortOrder === "newest" ? dateB - dateA : dateA - dateB
        })
    : []

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  if (loading)
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )

  if (error)
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-red-50 p-6 text-red-800 dark:bg-red-950 dark:text-red-200">
          <h3 className="text-lg font-medium">{t('error')}</h3>
          <p className="mt-2">{error.message}</p>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 pb-12">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="flex items-center gap-2 text-3xl font-bold sm:text-4xl">
              <Newspaper className="h-8 w-8 text-primary" />
              {t('news')}
            </h1>
            <p className="mt-2 text-muted-foreground">{t('discover')}</p>
          </motion.div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder= {t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="sm:hidden">
                    <Filter className="mr-2 h-4 w-4" />
                    {t('filters')}
                    {selectedTags.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedTags.length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>{t('filters')}</SheetTitle>
                    <SheetDescription>{t('filtersDate')}</SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 font-medium">
                        <Tag className="h-4 w-4 text-primary" />
                        {t('tags')}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {allTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant={selectedTags.includes(tag) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 font-medium">
                        <Calendar className="h-4 w-4 text-primary" />
                        {t('sortByDate')}
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          variant={sortOrder === "newest" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSortOrder("newest")}
                        >
                          {t('newest')}
                        </Button>
                        <Button
                          variant={sortOrder === "oldest" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSortOrder("oldest")}
                        >
                          {t('oldest')}
                        </Button>
                      </div>
                    </div>
                    {(selectedTags.length > 0 || searchTerm || sortOrder !== "newest") && (
                      <Button variant="ghost" size="sm" className="w-full" onClick={clearFilters}>
                        {t('resetFilters')}
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              <div className="hidden items-center gap-2 sm:flex">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Tags
                      {selectedTags.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {selectedTags.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex max-h-[300px] flex-col gap-1 overflow-y-auto p-2">
                      {allTags.map((tag) => (
                        <DropdownMenuItem
                          key={tag}
                          className={`cursor-pointer rounded-md ${
                            selectedTags.includes(tag) ? "bg-primary/10 font-medium text-primary" : ""
                          }`}
                          onClick={(e) => {
                            e.preventDefault()
                            toggleTag(tag)
                          }}
                        >
                          {tag}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      {sortOrder === "newest" ? t('newest') : t('oldest')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortOrder("newest")}>{t('newest')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOrder("oldest")}>{t('oldest')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tabs
                  defaultValue="grid"
                  value={viewMode}
                  onValueChange={(value) => setViewMode(value as "grid" | "list")}
                  className="hidden sm:block"
                >
                  <TabsList className="grid h-8 w-16 grid-cols-2">
                    <TabsTrigger value="grid" className="h-7 px-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="7" height="7" x="3" y="3" rx="1" />
                        <rect width="7" height="7" x="14" y="3" rx="1" />
                        <rect width="7" height="7" x="14" y="14" rx="1" />
                        <rect width="7" height="7" x="3" y="14" rx="1" />
                      </svg>
                    </TabsTrigger>
                    <TabsTrigger value="list" className="h-7 px-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="3" x2="21" y1="6" y2="6" />
                        <line x1="3" x2="21" y1="12" y2="12" />
                        <line x1="3" x2="21" y1="18" y2="18" />
                      </svg>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {(selectedTags.length > 0 || searchTerm || sortOrder !== "newest") && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2">
                    {t('resetFilters')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {selectedTags.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('activeFilters')} :</span>
              {selectedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1" onClick={() => toggleTag(tag)}>
                  {tag}
                  <button
                    className="ml-1 rounded-full p-0.5 hover:bg-background/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleTag(tag)
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {filteredArticles.length > 0 ? (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className={
              viewMode === "grid" ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-6"
            }
          >
            {filteredArticles.map((article: Article) => (
              <ArticleCard key={article.id} article={article} viewMode={viewMode} />
            ))}
          </motion.div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Newspaper className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 text-lg font-medium">{t('noArticles')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('changeFilters')}
            </p>
            {(selectedTags.length > 0 || searchTerm) && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                {t('resetFilters')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
