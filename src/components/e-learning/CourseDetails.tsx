import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_EVALUATIONS_BY_MODULE } from '@/graphql/evaluation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CheckCircle, BookOpen, FileText } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { ApolloError } from '@apollo/client';
import Link from 'next/link';

export interface Lesson {
  id: string;
  title: string;
}

interface Evaluation {
  id: string;
  pass_score: number;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  required_license: string;
  modules: Module[];
}

interface CourseDetailsProps {
  course: Course;
  courseProgress: number;
  progressLoading: boolean;
  progressError: ApolloError | undefined;
  setSelectedLesson: (lesson: Lesson) => void;
}

export function CourseDetails({ course, courseProgress, progressLoading, progressError, setSelectedLesson }: CourseDetailsProps) {
  const [expandedModule, setExpandedModule] = useState<string>('');

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl">{course.title}</CardTitle>
          <Badge variant="secondary">{course.required_license}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-gray-600 dark:text-gray-400">{course.description}</p>
        <div className="mb-6">
          {progressLoading ? (
            <Skeleton className="h-4 w-full" />
          ) : progressError ? (
            <p className="text-red-500 dark:text-red-400">Erreur lors du chargement de la progression</p>
          ) : (
            <div className="space-y-2">
              <Progress value={courseProgress} className="w-full" />
              <p className="text-sm text-right text-gray-600 dark:text-gray-400">Progression : {Math.round(courseProgress)}%</p>
            </div>
          )}
        </div>
        <Accordion 
          type="single" 
          collapsible 
          className="w-full"
          value={expandedModule}
          onValueChange={setExpandedModule}
        >
          {[...course.modules]
            .sort((a, b) => parseInt(a.id) - parseInt(b.id))
            .map((module) => (
              <AccordionItem key={module.id} value={module.id}>
                <AccordionTrigger className="text-lg font-medium">
                  <BookOpen className="mr-2 h-5 w-5" />
                  {module.title}
                </AccordionTrigger>
                <AccordionContent>
                  <ModuleContent 
                    module={module} 
                    setSelectedLesson={setSelectedLesson} 
                    isExpanded={expandedModule === module.id}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

interface ModuleContentProps {
  module: Module;
  setSelectedLesson: (lesson: Lesson) => void;
  isExpanded: boolean;
}

function ModuleContent({ module, setSelectedLesson, isExpanded }: ModuleContentProps) {
  const { data, loading, error } = useQuery(GET_EVALUATIONS_BY_MODULE, {
    variables: { moduleId: parseInt(module.id) },
    skip: !isExpanded,
  });

  if (loading) return <Skeleton className="h-20 w-full" />;
  if (error) return <p className="text-red-500">Error loading evaluations: {error.message}</p>;

  const evaluations = data?.getEvaluationsByModule || [];

  return (
    <ul className="space-y-2 pl-6">
      {[...module.lessons]
        .sort((a, b) => parseInt(a.id) - parseInt(b.id))
        .map((lesson) => (
          <li key={lesson.id}>
            <Button
              variant="ghost"
              className="w-full justify-start text-sm"
              onClick={() => setSelectedLesson(lesson)}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {lesson.title}
            </Button>
          </li>
        ))}
      {evaluations.map((evaluation: Evaluation) => (
        <li key={evaluation.id}>
          <Link href={`evaluation/${evaluation.id}`} passHref>
            <Button
              variant="outline"
              className="w-full justify-start text-sm"
            >
              <FileText className="mr-2 h-4 w-4" />
              Évaluation (Score de passage : {evaluation.pass_score}%)
            </Button>
          </Link>
        </li>
      ))}
    </ul>
  );
}
