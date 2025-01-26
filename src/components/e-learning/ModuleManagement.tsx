'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_COURSES, GET_MODULES_BY_COURSE, CREATE_MODULE, UPDATE_MODULE, DELETE_MODULE } from '@/graphql/learningAdmin';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Grid } from "@/components/ui/grid";
import { PlusCircle, Layers, BookOpen, Edit, Trash2 } from 'lucide-react';
import { motion } from "framer-motion";
import { toast } from "@/components/hooks/use-toast";

export function ModuleManagement() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [editingModule, setEditingModule] = useState<any>(null);

  const { data: coursesData } = useQuery(GET_COURSES);
  const { data: modulesData, loading, error, refetch } = useQuery(GET_MODULES_BY_COURSE, {
    variables: { courseId: parseFloat(selectedCourseId) },
    skip: !selectedCourseId,
  });
  const [createModule] = useMutation(CREATE_MODULE, {
    onCompleted: () => {
      refetch();
      toast({ title: "Module créé", description: "Le module a été créé avec succès." });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });
  const [updateModule] = useMutation(UPDATE_MODULE, {
    onCompleted: () => {
      refetch();
      toast({ title: "Module mis à jour", description: "Le module a été mis à jour avec succès." });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });
  const [deleteModule] = useMutation(DELETE_MODULE, {
    onCompleted: () => {
      refetch();
      toast({ title: "Module supprimé", description: "Le module a été supprimé avec succès." });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createModule({
        variables: {
          createModuleInput: {
            title,
            description,
            courseId: parseInt(courseId),
          },
        },
      });
      setTitle('');
      setDescription('');
      if (selectedCourseId) {
        await refetch({ courseId: parseFloat(selectedCourseId) });
      }
    } catch (err) {
      console.error('Error creating module:', err);
    }
  };

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateModule({
        variables: {
          updateModuleInput: {
            id: editingModule.id,
            title: editingModule.title,
            description: editingModule.description,
            courseId: parseInt(editingModule.courseId),
          },
        },
      });
      setEditingModule(null);
    } catch (err) {
      console.error('Error updating module:', err);
    }
  };

  const handleDeleteModule = async (id: string) => {
    try {
      await deleteModule({
        variables: { id: parseInt(id) },
      });
    } catch (err) {
      console.error('Error deleting module:', err);
    }
  };

  if (loading) return <p>Chargement...</p>;
  if (error) return <p>Erreur : {error.message}</p>;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Créer un nouveau module</CardTitle>
          <CardDescription>Remplissez les détails du module ci-dessous</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select value={courseId} onValueChange={(value) => { setCourseId(value); setSelectedCourseId(value); }}>
              <SelectTrigger>
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
            <Input
              placeholder="Titre du module"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Textarea
              placeholder="Description du module"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button type="submit" className="w-full">
              <PlusCircle className="w-4 h-4 mr-2" />
              Créer le module
            </Button>
          </form>
        </CardContent>
      </Card>

      {selectedCourseId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              Modules du cours sélectionné
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Grid columns={3} gap={4}>
              {modulesData?.getModulesByCourse.map((module: any) => (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Layers className="w-4 h-4 mr-2" />
                        {module.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{module.description}</p>
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
                            <DialogTitle>Modifier le module</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleUpdateModule} className="space-y-4">
                            <Input
                              placeholder="Titre du module"
                              value={editingModule?.title}
                              onChange={(e) => setEditingModule({...editingModule, title: e.target.value})}
                              required
                            />
                            <Textarea
                              placeholder="Description du module"
                              value={editingModule?.description}
                              onChange={(e) => setEditingModule({...editingModule, description: e.target.value})}
                            />
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
                            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce module ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action ne peut pas être annulée. Cela supprimera définitivement le module et toutes les leçons associées.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteModule(module.id)}>Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
