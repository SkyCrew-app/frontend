'use client';

import { useQuery } from '@apollo/client';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Calendar, Tag, Share2, Printer } from 'lucide-react';
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.description,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      toast({
        title: 'Partage non supporté',
        description: 'Votre navigateur ne supporte pas la fonction de partage.',
        variant: 'destructive',
      });
    }
  };

  const addToCalendar = (type: 'google' | 'apple') => {
    if (!article.eventDate) {
      toast({
        title: 'Erreur',
        description: "Cet article n'a pas de date d'événement associée.",
        variant: 'destructive',
      });
      return;
    }

    if (type === 'google') {
      window.open(
        `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(article.title)}&details=${encodeURIComponent(
          article.description
        )}&dates=${new Date(article.eventDate).toISOString().replace(/-|:|\.\d\d\d/g, '')}/${new Date(article.eventDate)
          .toISOString()
          .replace(/-|:|\.\d\d\d/g, '')}`,
        '_blank'
      );
    } else if (type === 'apple') {
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
    }
  };

  const handlePrint = () => {
    window.print();
  };

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
        <CardContent className="mt-8">
          <div className="flex flex-wrap justify-between items-center mb-4">
            <div className="flex items-center space-x-4 mb-2 sm:mb-0">
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
            <div className="flex flex-wrap items-center gap-2">
              {article.tags && article.tags.map((tag: string) => (
                <Badge key={tag} variant="default" className="flex items-center">
                  <Tag className="w-4 h-4 mr-1" /> {tag}
                </Badge>
              ))}
            </div>
          </div>

          <p className="text-lg text-muted-foreground mb-6">{article.description}</p>
          <div
            className="mt-6 text-base leading-relaxed text-foreground prose prose-ul:marker:text-black prose-li:list-disc max-w-none"
            dangerouslySetInnerHTML={{ __html: article.text }}
          />
        </CardContent>

        <CardFooter className="mt-8 flex flex-wrap justify-end gap-4">
          {article.eventDate && (
            <>
              <Button variant="outline" onClick={() => addToCalendar('google')}>
                <Calendar className="w-4 h-4 mr-2" />
                Google Calendar
              </Button>
              <Button variant="outline" onClick={() => addToCalendar('apple')}>
                <Calendar className="w-4 h-4 mr-2" />
                Apple Calendar
              </Button>
            </>
          )}
          <Button variant="default" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Partager
          </Button>
          <Button variant="secondary" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimer
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
