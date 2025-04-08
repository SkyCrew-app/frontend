"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@apollo/client"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, CheckCircle, XCircle, Book, Search, ChevronLeft, ChevronRight, Filter } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { GET_USER_EVALUATION_RESULTS } from "@/graphql/evaluation"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { useMediaQuery } from "@/hooks/use-media-query"

interface Module {
  id: number
  title: string
  description: string
}

interface Evaluation {
  id: number
  pass_score: number
  module: Module
}

interface UserProgress {
  id: number
  score: number | null
  passed: boolean
  completed_at: string | null
  evaluation: Evaluation
}

export default function EvaluationsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [filterStatus, setFilterStatus] = useState("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<string | null>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const { data, loading, error } = useQuery(GET_USER_EVALUATION_RESULTS, {
    variables: { userId },
    skip: !userId,
  })

  const userProgressResults: UserProgress[] = data?.getUserEvaluationResults || []

  const filteredResults = userProgressResults.filter((progress) => {
    const matchesSearch =
      progress.evaluation.module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      progress.evaluation.module.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "passed" && progress.passed) ||
      (filterStatus === "failed" && !progress.passed)

    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage)
  const paginatedResults = filteredResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <h1 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-8">Mes Évaluations</h1>

      {/* Mobile filter toggle */}
      {isMobile && (
        <Button
          variant="outline"
          className="w-full mb-4 flex items-center justify-center"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtres {filterStatus !== "all" && "(1)"}
        </Button>
      )}

      {/* Filters - responsive */}
      <div className={`flex flex-col gap-3 mb-4 ${isMobile && !isFilterOpen ? "hidden" : "block"}`}>
        <div className="relative flex-grow">
          <Input
            type="text"
            placeholder="Rechercher un module..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="passed">Réussis</SelectItem>
            <SelectItem value="failed">Échoués</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 sm:h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-red-500 text-sm sm:text-base">
              Erreur lors du chargement des évaluations: {error.message}
            </p>
          </CardContent>
        </Card>
      ) : paginatedResults.length > 0 ? (
        <>
          <div className="space-y-4">
            {paginatedResults.map((progress) => (
              <Card key={progress.id} className="overflow-hidden transition-shadow hover:shadow-md">
                <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 to-primary/5 p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div>
                      <CardTitle className="text-lg sm:text-2xl mb-1 line-clamp-1">
                        {progress.evaluation.module.title}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {progress.evaluation.module.description}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={progress.passed ? "default" : "destructive"}
                      className="text-xs sm:text-sm px-2 py-1 w-fit"
                    >
                      {progress.passed ? "Réussi" : "Échoué"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 p-3 sm:p-6 sm:pt-4">
                  <div className="flex flex-col space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm gap-2">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                        <span className="truncate">
                          {progress.completed_at
                            ? format(new Date(progress.completed_at), isMobile ? "dd/MM/yy" : "dd MMMM yyyy", {
                                locale: fr,
                              })
                            : "Date non disponible"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Book className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                        <span>Module ID: {progress.evaluation.module.id}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs sm:text-sm font-medium">Score</span>
                        <span className="text-xs sm:text-sm font-medium">
                          {progress.score !== null ? `${progress.score}% / ${progress.evaluation.pass_score}%` : "N/A"}
                        </span>
                      </div>
                      <Progress value={progress.score !== null ? progress.score : 0} className="h-2" />
                    </div>
                    <div className="flex items-center justify-center">
                      {progress.passed ? (
                        <div className="flex items-center space-x-1 sm:space-x-2 text-green-500">
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                          <p className="text-xs sm:text-sm font-medium">Évaluation réussie</p>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 sm:space-x-2 text-red-500">
                          <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                          <p className="text-xs sm:text-sm font-medium">Évaluation non réussie</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination - responsive */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-4 sm:mt-6">
            <div className="flex items-center space-x-2 order-2 sm:order-1">
              <span className="text-xs sm:text-sm text-gray-600">Résultats par page:</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[60px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-center space-x-2 order-1 sm:order-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs sm:text-sm text-gray-600 min-w-[80px] text-center">
                Page {currentPage} sur {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-center text-gray-500 text-sm sm:text-base">Aucune évaluation trouvée.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
