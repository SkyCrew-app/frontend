'use client';

import { useQuery } from '@apollo/client';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader } from '@/components/ui/card';
import { Calendar, Tag } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import { GET_ARTICLE_BY_ID } from '@/graphql/articles';

export default function ArticlePage() {
  const { id } = useParams();
  const { toast } = useToast();

  const intId = parseInt(id as string, 10);

  const { data, loading, error } = useQuery(GET_ARTICLE_BY_ID, {
    variables: { id: intId },
    skip: !id,
    onError: () => {
      toast({
        title: 'Erreur',
        description: "Impossible de charger l'article.",
        variant: 'destructive',
      });
    },
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-8 w-2/3 mt-6" />
        <Skeleton className="h-4 w-1/2 mt-4" />
        <Skeleton className="h-32 w-full mt-6" />
      </div>
    );
  }

  if (error || !data?.article) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-lg font-medium text-muted-foreground">Article introuvable.</p>
      </div>
    );
  }

  const article = data.article;

  return (
    <div className="container mx-auto p-6">
      <Card className="overflow-hidden shadow-md">
        <CardHeader className="p-0 relative">
          <img
            src={article.photo_url ? `http://localhost:3000${article.photo_url}` : 'https://via.placeholder.com/800x400'}
            alt={article.title}
            className="w-full h-72 object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-6">
            <h1 className="text-white text-4xl font-bold">{article.title}</h1>
          </div>
        </CardHeader>
      </Card>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(article.createdAt).toLocaleDateString('fr-FR')}
            </Badge>
            {article.eventDate && (
              <Badge variant="outline">
                Événement : {new Date(article.eventDate).toLocaleDateString('fr-FR')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {article.tags.map((tag: string) => (
              <Badge key={tag} variant="default" className="flex items-center">
                <Tag className="w-4 h-4 mr-1" /> {tag}
              </Badge>
            ))}
          </div>
        </div>

        <p className="text-lg text-muted-foreground">{article.description}</p>
        <div
          className="mt-6 text-base leading-relaxed text-foreground prose prose-ul:marker:text-black prose-li:list-disc"
          dangerouslySetInnerHTML={{ __html: article.text }}
        />
      </div>

      <CardFooter className="mt-8 flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={() =>
            window.open(
              `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(article.title)}&details=${encodeURIComponent(
                article.description
              )}&dates=${new Date(article.eventDate).toISOString().replace(/-|:|\.\d\d\d/g, '')}/${new Date(article.eventDate)
                .toISOString()
                .replace(/-|:|\.\d\d\d/g, '')}`,
              '_blank'
            )
          }
        >
          Ajouter à Google Calendar
        </Button>
        <Button
          variant="default"
          onClick={() => {
            const calendarData = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${article.title}
DESCRIPTION:${article.description}
DTSTART:${new Date(article.eventDate).toISOString().replace(/-|:|\.\d\d\d/g, '')}
END:VEVENT
END:VCALENDAR`;
            const blob = new Blob([calendarData], { type: 'text/calendar' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${article.title}.ics`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Télécharger pour Apple Calendar
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>Imprimer</Button>
      </CardFooter>
    </div>
  );
}
