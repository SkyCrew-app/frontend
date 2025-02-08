'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client';
import { GET_LESSON_CONTENT, MARK_LESSON_COMPLETED } from '@/graphql/instruction';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle, Paperclip, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { AwaitedReactNode, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useState } from 'react';
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser, useUserData } from '@/components/hooks/userHooks';

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;
  const [isCompleting, setIsCompleting] = useState(false);
  const userEmail = useCurrentUser();
  const userData = useUserData(userEmail);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (userData) {
      setUserId(userData.id);
    }
  }, [userData]);

  const { data, loading, error } = useQuery(GET_LESSON_CONTENT, {
    variables: { lessonId: parseInt(lessonId, 10), userId },
    skip: !lessonId,
  });

  const [markAsCompleted] = useMutation(MARK_LESSON_COMPLETED, {
    refetchQueries: [GET_LESSON_CONTENT],
  });

  if (loading) return <LessonSkeleton />;
  if (error) return <ErrorMessage message={error.message} />;
  if (!data || !data.getLessonContent) return <ErrorMessage message="Aucune donnée de leçon disponible." />;

  const lesson = data.getLessonContent;

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await markAsCompleted({ variables: { lessonId: lesson.id, userId } });
    } catch (error) {
      console.error('Error marking lesson as completed:', error);
    } finally {
      setIsCompleting(false);
      router.push(`/instruction/e-learning`);
    }
  };

  const handleNavigation = (direction: 'prev' | 'next') => {
    const newLessonId = direction === 'prev'
      ? parseInt(lessonId, 10) - 1
      : parseInt(lessonId, 10) + 1;
    router.push(`/instruction/e-learning/${courseId}/${newLessonId}`);
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="ghost"
          asChild
        >
          <Link href={`/instruction/e-learning`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste des cours
          </Link>
        </Button>
        <Progress value={33} className="w-1/3" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <h1 className="text-3xl font-bold">{lesson.title}</h1>
            <p className="text-lg text-muted-foreground">{lesson.description}</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="video" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="video">Vidéo</TabsTrigger>
                <TabsTrigger value="content">Contenu</TabsTrigger>
              </TabsList>
              <TabsContent value="video">
                {lesson.video_url && (
                  <div className="aspect-w-16 aspect-h-9">
                    <iframe
                      src={lesson.video_url.replace('watch?v=', 'embed/')}
                      title={lesson.title}
                      className="w-full h-full"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="content">
                {lesson.content ? (
                  <div className="prose dark:prose-invert max-w-none">
                    {typeof lesson.content === 'string' ? (
                      <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
                    ) : lesson.content.sections ? (
                      lesson.content.sections.map((section: { heading: string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined; body: string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined; }, index: Key | null | undefined) => (
                        <div key={index} className="mb-6">
                          <h3 className="text-xl font-semibold mb-2">{section.heading}</h3>
                          <p>{section.body}</p>
                        </div>
                      ))
                    ) : (
                      <p>Le format du contenu n'est pas reconnu.</p>
                    )}
                  </div>
                ) : (
                  <p>Aucun contenu disponible pour cette leçon.</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              onClick={() => handleNavigation('prev')}
              disabled={parseInt(lessonId, 10) === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Leçon précédente
            </Button>
            <Button
              onClick={() => handleNavigation('next')}
            >
              Leçon suivante
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Ressources</h2>
          </CardHeader>
          <CardContent>
            {lesson.content && lesson.content.attachments && lesson.content.attachments.length > 0 ? (
              <ul className="space-y-2">
                {lesson.content.attachments.map((attachment: { url: string; name: string }, index: number) => (
                  <li key={index}>
                    <Button variant="outline" asChild className="w-full justify-start">
                      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                        <Paperclip className="mr-2 h-4 w-4" />
                        {attachment.name || `Pièce jointe ${index + 1}`}
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Aucune ressource disponible pour cette leçon.</p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleComplete}
              disabled={lesson.completed || isCompleting}
              className="w-full"
            >
              {lesson.completed ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Leçon terminée
                </>
              ) : (
                <>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Marquer comme terminée
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {lesson.completed && (
        <Badge variant="default" className="mt-6 w-full justify-center py-2">
          <CheckCircle className="mr-2 h-4 w-4" />
          Vous avez terminé cette leçon
        </Badge>
      )}
    </div>
  );
}

function LessonSkeleton() {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Skeleton className="h-8 w-40 mb-4" />
      <Skeleton className="h-12 w-3/4 mb-4" />
      <Skeleton className="h-6 w-1/2 mb-6" />
      <Skeleton className="w-full aspect-video mb-6" />
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
      <div className="flex justify-between">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="border-destructive">
        <CardHeader>
          <h2 className="text-2xl font-semibold text-destructive">Erreur</h2>
        </CardHeader>
        <CardContent>
          <p>{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}
