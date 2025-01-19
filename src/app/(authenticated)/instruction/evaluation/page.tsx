'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, CheckCircle, XCircle, Book, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { GET_USER_EVALUATION_RESULTS } from "@/graphql/evaluation";

interface Module {
  id: number;
  title: string;
  description: string;
}

interface Evaluation {
  id: number;
  pass_score: number;
  module: Module;
}

interface UserProgress {
  id: number;
  score: number | null;
  passed: boolean;
  completed_at: string | null;
  evaluation: Evaluation;
}

export default function EvaluationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [filterStatus, setFilterStatus] = useState('all');
  const userId = 2; // TODO: Remplacer par l'ID de l'utilisateur authentifié

  const { data, loading, error } = useQuery(GET_USER_EVALUATION_RESULTS, {
    variables: { userId },
  });

  const userProgressResults: UserProgress[] = data?.getUserEvaluationResults || [];

  const filteredResults = userProgressResults.filter((progress) => {
    const matchesSearch = progress.evaluation.module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      progress.evaluation.module.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'passed' && progress.passed) ||
      (filterStatus === 'failed' && !progress.passed);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Mes Évaluations</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Input
            type="text"
            placeholder="Rechercher un module..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-[200px]">
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
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-500">Erreur lors du chargement des évaluations: {error.message}</p>
          </CardContent>
        </Card>
      ) : paginatedResults.length > 0 ? (
        <>
          <ScrollArea className="h-[calc(100vh-350px)]">
            <div className="space-y-6 pr-4">
              {paginatedResults.map((progress) => (
                <Card key={progress.id} className="overflow-hidden transition-shadow hover:shadow-lg">
                  <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 to-primary/5">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl mb-1">{progress.evaluation.module.title}</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                          {progress.evaluation.module.description}
                        </CardDescription>
                      </div>
                      <Badge variant={progress.passed ? "default" : "destructive"} className="text-sm px-2 py-1">
                        {progress.passed ? "Réussi" : "Échoué"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex flex-col space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>
                            {progress.completed_at
                              ? format(new Date(progress.completed_at), 'dd MMMM yyyy', { locale: fr })
                              : 'Date non disponible'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Book className="h-4 w-4 text-primary" />
                          <span>Module ID: {progress.evaluation.module.id}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Score</span>
                          <span className="text-sm font-medium">
                            {progress.score !== null ? `${progress.score} % / requis : ${progress.evaluation.pass_score} %` : 'N/A'}
                          </span>
                        </div>
                        <Progress
                          value={progress.score !== null ? progress.score : 0}
                          className="h-2"
                        />
                      </div>
                      <div className="flex items-center justify-center">
                        {progress.passed ? (
                          <div className="flex items-center space-x-2 text-green-500">
                            <CheckCircle className="h-5 w-5" />
                            <p className="text-sm font-medium">Évaluation réussie</p>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-red-500">
                            <XCircle className="h-5 w-5" />
                            <p className="text-sm font-medium">Évaluation non réussie</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-between items-center mt-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Résultats par page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} sur {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Aucune évaluation trouvée.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
