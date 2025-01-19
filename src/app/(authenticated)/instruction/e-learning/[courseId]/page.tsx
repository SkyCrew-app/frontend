'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_COURSE_DETAILS } from '@/graphql/instruction';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useParams } from 'next/navigation';

interface Module {
  id: string;
  title: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  modules: Module[];
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const userId = 2; // TODO: Remplacer par la logique d'authentification réelle

  const { data, loading, error } = useQuery<{ getCourseById: Course }>(GET_COURSE_DETAILS, {
    variables: { courseId: parseFloat(courseId), userId: userId },
    skip: !courseId,
  });

  if (loading) return <p className="text-center mt-8">Chargement du cours...</p>;
  if (error) return <p className="text-center mt-8 text-red-500">Erreur : {error.message}</p>;
  if (!data || !data.getCourseById) return <p className="text-center mt-8">Aucune donnée de cours disponible.</p>;

  const course = data.getCourseById;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
      <p className="mb-4 text-gray-600">{course.description}</p>
      <p className="mb-8 text-sm text-gray-500">Catégorie : {course.category}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <h2 className="text-xl font-semibold">Modules du cours</h2>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {course.modules.map((module) => (
                <AccordionItem key={module.id} value={module.id}>
                  <AccordionTrigger>{module.title}</AccordionTrigger>
                  <AccordionContent>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => setSelectedModule(module.id)}
                    >
                      Voir les détails
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <h2 className="text-xl font-semibold">Contenu du module</h2>
          </CardHeader>
          <CardContent>
            {selectedModule ? (
              <p>Contenu du module {selectedModule}</p>
              // TODO: Ajouter ici la logique pour afficher le contenu du module sélectionné
            ) : (
              <p>Sélectionnez un module pour voir son contenu.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

