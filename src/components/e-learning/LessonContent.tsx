import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Maximize2, Book, Video, AlertCircle } from "lucide-react"
import Link from "next/link"

interface ContentSection {
  heading: string
  body: string
}

interface Lesson {
  id: string
  title: string
  description: string
  video_url?: string
  content: {
    title: string
    sections: ContentSection[]
  }
}

interface LessonContentProps {
  lesson: Lesson | undefined
  courseId: string
  lessonLoading: boolean
  lessonError: { message: string } | null
}

export function LessonContent({ lesson, courseId, lessonLoading, lessonError }: LessonContentProps) {
  if (lessonLoading) {
    return (
      <Card className="border border-gray-200 dark:border-gray-700 shadow-sm" suppressHydrationWarning>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-5/6" />
          <div className="mt-6">
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (lessonError) {
    return (
      <Card className="border border-gray-200 dark:border-gray-700 shadow-sm" suppressHydrationWarning>
        <CardContent className="pt-6">
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1">Erreur lors du chargement de la leçon</h3>
              <p className="text-sm">{lessonError.message}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!lesson) return null

  return (
    <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <CardTitle className="text-2xl font-bold">{lesson.title}</CardTitle>
            <CardDescription className="mt-2 text-base">{lesson.description}</CardDescription>
          </div>
          <Button asChild size="sm" variant="outline" className="self-start">
            <Link href={`/instruction/e-learning/${courseId}/${lesson.id}`}>
              <Maximize2 className="h-4 w-4 mr-2" />
              Mode plein écran
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="w-full mb-6 flex">
            <TabsTrigger value="content" className="flex-1 py-2 text-xs sm:text-sm">
              <Book className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Contenu</span>
            </TabsTrigger>
            <TabsTrigger value="video" disabled={!lesson.video_url} className="flex-1 py-2 text-xs sm:text-sm">
              <Video className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Vidéo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-0">
            <div className="prose dark:prose-invert max-w-none">
              {lesson.content?.title && <h3 className="text-2xl font-bold mb-6">{lesson.content.title}</h3>}

              {lesson.content?.sections?.length > 0 ? (
                <div className="space-y-8">
                  {lesson.content.sections.map((section, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
                    >
                      <h4 className="text-xl font-semibold mb-4 text-primary">{section.heading}</h4>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{section.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p>Aucun contenu disponible pour cette leçon.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="video" className="mt-0">
            {lesson.video_url ? (
              <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-black">
                <div className="aspect-w-16 aspect-h-9">
                  <iframe
                    src={lesson.video_url}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  ></iframe>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <Video className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Aucune vidéo disponible pour cette leçon.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
