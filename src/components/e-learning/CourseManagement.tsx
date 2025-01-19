'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_COURSES, CREATE_COURSE, UPDATE_COURSE, DELETE_COURSE } from '@/graphql/learningAdmin';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlusCircle, Book, Bookmark, Edit, Trash2 } from 'lucide-react';
import { motion } from "framer-motion";
import { toast } from "@/components/hooks/use-toast";

enum LicenseType {
  PPL = 'PPL',
  CPL = 'CPL',
  ATPL = 'ATPL',
}

export function CourseManagement() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [requiredLicense, setRequiredLicense] = useState<LicenseType | ''>('');
  const [editingCourse, setEditingCourse] = useState<any>(null);

  const { data, loading, error, refetch } = useQuery(GET_COURSES);
  const [createCourse] = useMutation(CREATE_COURSE, {
    onCompleted: () => {
      refetch();
      toast({ title: "Cours créé", description: "Le cours a été créé avec succès." });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });
  const [updateCourse] = useMutation(UPDATE_COURSE, {
    onCompleted: () => {
      refetch();
      toast({ title: "Cours mis à jour", description: "Le cours a été mis à jour avec succès." });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });
  const [deleteCourse] = useMutation(DELETE_COURSE, {
    onCompleted: () => {
      refetch();
      toast({ title: "Cours supprimé", description: "Le cours a été supprimé avec succès." });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCourse({
        variables: {
          createCourseInput: {
            title,
            description,
            category,
            required_license: requiredLicense,
          },
        },
      });
      setTitle('');
      setDescription('');
      setCategory('');
      setRequiredLicense('');
    } catch (err) {
      console.error('Error creating course:', err);
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCourse({
        variables: {
          updateCourseInput: {
            id: editingCourse.id,
            title: editingCourse.title,
            description: editingCourse.description,
            category: editingCourse.category,
            required_license: editingCourse.required_license,
          },
        },
      });
      setEditingCourse(null);
    } catch (err) {
      console.error('Error updating course:', err);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await deleteCourse({
        variables: { id: parseInt(id) },
      });
    } catch (err) {
      console.error('Error deleting course:', err);
    }
  };

  if (loading) return <p>Chargement...</p>;
  if (error) return <p>Erreur : {error.message}</p>;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Créer un nouveau cours</CardTitle>
          <CardDescription>Remplissez les détails du cours ci-dessous</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Titre du cours"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Textarea
              placeholder="Description du cours"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Input
              placeholder="Catégorie"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <Select value={requiredLicense} onValueChange={(value) => setRequiredLicense(value as LicenseType)}>
              <SelectTrigger>
                <SelectValue placeholder="Licence requise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                <SelectItem value={LicenseType.PPL}>PPL</SelectItem>
                <SelectItem value={LicenseType.CPL}>CPL</SelectItem>
                <SelectItem value={LicenseType.ATPL}>ATPL</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" className="w-full">
              <PlusCircle className="w-4 h-4 mr-2" />
              Créer le cours
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.getCourses.map((course: any) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Book className="w-5 h-5 mr-2" />
                    {course.title}
                  </span>
                </CardTitle>
                <CardDescription>{course.category || 'Aucune catégorie'}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">{course.description}</p>
                <div className="flex items-center">
                  <Bookmark className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">
                    Licence requise : {course.required_license || 'Aucune'}
                  </span>
                </div>
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
                      <DialogTitle>Modifier le cours</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateCourse} className="space-y-4">
                      <Input
                        placeholder="Titre du cours"
                        value={editingCourse?.title}
                        onChange={(e) => setEditingCourse({...editingCourse, title: e.target.value})}
                        required
                      />
                      <Textarea
                        placeholder="Description du cours"
                        value={editingCourse?.description}
                        onChange={(e) => setEditingCourse({...editingCourse, description: e.target.value})}
                      />
                      <Input
                        placeholder="Catégorie"
                        value={editingCourse?.category}
                        onChange={(e) => setEditingCourse({...editingCourse, category: e.target.value})}
                      />
                      <Select 
                        value={editingCourse?.required_license} 
                        onValueChange={(value) => setEditingCourse({...editingCourse, required_license: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Licence requise" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucune</SelectItem>
                          <SelectItem value={LicenseType.PPL}>PPL</SelectItem>
                          <SelectItem value={LicenseType.CPL}>CPL</SelectItem>
                          <SelectItem value={LicenseType.ATPL}>ATPL</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce cours ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action ne peut pas être annulée. Cela supprimera définitivement le cours et tous les modules et leçons associés.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteCourse(course.id)}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

