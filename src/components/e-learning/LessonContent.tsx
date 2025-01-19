import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Maximize2, Book, Video } from 'lucide-react';
import Link from 'next/link';

interface ContentSection {
  heading: string;
  body: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url?: string;
  content: {
    title: string;
    sections: ContentSection[];
  };
}

interface LessonContentProps {
  lesson: Lesson | undefined;
  courseId: string;
  lessonLoading: boolean;
  lessonError: { message: string } | null;
}

export function LessonContent({ lesson, courseId, lessonLoading, lessonError }: LessonContentProps) {
  if (lessonLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (lessonError) {
    return (
      <Card>
        <CardContent>
          <p className="text-center py-4 text-red-500 dark:text-red-400">Erreur : {lessonError.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!lesson) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle className="text-2xl">{lesson.title}</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href={`/instruction/e-learning/${courseId}/${lesson.id}`}>
            <Maximize2 className="h-4 w-4 mr-2" />
            Agrandir
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{lesson.description}</p>
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content">
              <Book className="h-4 w-4 mr-2" />
              Contenu
            </TabsTrigger>
            <TabsTrigger value="video" disabled={!lesson.video_url}>
              <Video className="h-4 w-4 mr-2" />
              Vidéo
            </TabsTrigger>
          </TabsList>
          <TabsContent value="content">
            <div className="prose dark:prose-invert max-w-none mt-4">
              <h3 className="text-2xl font-bold mb-4">{lesson.content?.title}</h3>
              {lesson.content?.sections?.map((section, index) => (
                <div key={index} className="mb-4">
                  <h4 className="text-xl font-semibold mb-2">{section.heading}</h4>
                  <p>{section.body}</p>
                </div>
              )) || <p>Aucun contenu disponible pour cette leçon.</p>}
            </div>
          </TabsContent>
          <TabsContent value="video">
            {lesson.video_url ? (
              <div className="aspect-w-16 aspect-h-9 mt-4">
                <iframe
                  src={lesson.video_url}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full rounded-lg"
                ></iframe>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 mt-4">Aucune vidéo disponible pour cette leçon.</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
