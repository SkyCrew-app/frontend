'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_COURSES, GET_MODULES_BY_COURSE, GET_LESSONS_BY_MODULE, CREATE_LESSON, UPDATE_LESSON, DELETE_LESSON } from '@/graphql/learningAdmin';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, FileText, Video, Edit, Trash2 } from 'lucide-react';
import { toast } from "@/components/hooks/use-toast";

export function LessonManagement() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [editingLesson, setEditingLesson] = useState<any>(null);

  const { data: coursesData } = useQuery(GET_COURSES);
  const { data: modulesData, refetch: refetchModules } = useQuery(GET_MODULES_BY_COURSE, {
    variables: { courseId: parseInt(selectedCourseId) },
    skip: !selectedCourseId,
  });
  const { data: lessonsData, loading, error, refetch: refetchLessons } = useQuery(GET_LESSONS_BY_MODULE, {
    variables: { moduleId: parseInt(selectedModuleId) },
    skip: !selectedModuleId,
  });

  const [createLesson] = useMutation(CREATE_LESSON, {
    onCompleted: () => {
      refetchLessons();
      toast({ title: "Leçon créée", description: "La leçon a été créée avec succès." });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const [updateLesson] = useMutation(UPDATE_LESSON, {
    onCompleted: () => {
      refetchLessons();
      toast({ title: "Leçon mise à jour", description: "La leçon a été mise à jour avec succès." });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const [deleteLesson] = useMutation(DELETE_LESSON, {
    onCompleted: () => {
      refetchLessons();
      toast({ title: "Leçon supprimée", description: "La leçon a été supprimée avec succès." });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLesson({
        variables: {
          createLessonInput: {
            title,
            description,
            content: JSON.stringify({ text: content }),
            video_url: videoUrl,
            moduleId: parseInt(selectedModuleId),
          },
        },
      });
      setTitle('');
      setDescription('');
      setContent('');
      setVideoUrl('');
    } catch (err) {
      console.error('Error creating lesson:', err);
    }
  };

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateLesson({
        variables: {
          updateLessonInput: {
            id: editingLesson.id,
            title: editingLesson.title,
            description: editingLesson.description,
            content: JSON.stringify({ text: editingLesson.content }),
            video_url: editingLesson.video_url,
            moduleId: parseInt(editingLesson.moduleId),
          },
        },
      });
      setEditingLesson(null);
    } catch (err) {
      console.error('Error updating lesson:', err);
    }
  };

  const handleDeleteLesson = async (id: string) => {
    try {
      await deleteLesson({
        variables: { id: parseInt(id) },
      });
    } catch (err) {
      console.error('Error deleting lesson:', err);
    }
  };

  if (loading) return <p>Chargement...</p>;
  if (error) return <p>Erreur : {error.message}</p>;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Créer une nouvelle leçon</CardTitle>
          <CardDescription>Remplissez les détails de la leçon ci-dessous</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="course">Cours</Label>
              <Select value={selectedCourseId} onValueChange={(value) => { setSelectedCourseId(value); setSelectedModuleId(''); }}>
                <SelectTrigger id="course">
                  <SelectValue placeholder="Sélectionner un cours" />
                </SelectTrigger>
                <SelectContent>
                  {coursesData?.getCourses.map((course: any) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="module">Module</Label>
              <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                <SelectTrigger id="module">
                  <SelectValue placeholder="Sélectionner un module" />
                </SelectTrigger>
                <SelectContent>
                  {modulesData?.getModulesByCourse.map((module: any) => (
                    <SelectItem key={module.id} value={module.id.toString()}>
                      {module.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Titre de la leçon</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description de la leçon</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Contenu de la leçon</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="videoUrl">URL de la vidéo</Label>
              <Input
                id="videoUrl"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              <PlusCircle className="w-4 h-4 mr-2" />
              Créer la leçon
            </Button>
          </form>
        </CardContent>
      </Card>

      {selectedModuleId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Leçons du module sélectionné
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {lessonsData?.getLessonsByModule.map((lesson: any) => (
                  <Card key={lesson.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        {lesson.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-2">{lesson.description}</p>
                      {lesson.video_url && (
                        <div className="flex items-center text-sm text-blue-600">
                          <Video className="w-4 h-4 mr-2" />
                          Vidéo disponible
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Modifier la leçon</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleUpdateLesson} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="editTitle">Titre de la leçon</Label>
                              <Input
                                id="editTitle"
                                value={editingLesson?.title}
                                onChange={(e) => setEditingLesson({...editingLesson, title: e.target.value})}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="editDescription">Description de la leçon</Label>
                              <Textarea
                                id="editDescription"
                                value={editingLesson?.description}
                                onChange={(e) => setEditingLesson({...editingLesson, description: e.target.value})}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="editContent">Contenu de la leçon</Label>
                              <Textarea
                                id="editContent"
                                value={editingLesson?.content}
                                onChange={(e) => setEditingLesson({...editingLesson, content: e.target.value})}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="editVideoUrl">URL de la vidéo</Label>
                              <Input
                                id="editVideoUrl"
                                value={editingLesson?.video_url}
                                onChange={(e) => setEditingLesson({...editingLesson, video_url: e.target.value})}
                              />
                            </div>
                            <DialogFooter>
                              <Button type="submit">Enregistrer les modifications</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                            Supprimer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette leçon ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action ne peut pas être annulée. Cela supprimera définitivement la leçon.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteLesson(lesson.id)}>Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

