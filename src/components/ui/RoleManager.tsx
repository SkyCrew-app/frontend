import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/hooks/use-toast";
import { CREATE_ROLE, UPDATE_ROLE, DELETE_ROLE, GET_ROLES } from '@/graphql/roles';

interface Role {
  id: string;
  role_name: string;
}

export function RoleManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [mutationInProgress, setMutationInProgress] = useState(false);

  const { loading, error, refetch } = useQuery(GET_ROLES, {
    onCompleted: (data) => setRoles(data.roles),
  });

  const [createRole] = useMutation(CREATE_ROLE);
  const [updateRole] = useMutation(UPDATE_ROLE);
  const [deleteRole] = useMutation(DELETE_ROLE);

  const handleCreateRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMutationInProgress(true);
    const formData = new FormData(e.currentTarget);
    const role_name = formData.get('role_name') as string;

    try {
      await createRole({ variables: { createRoleInput: { role_name } } });
      toast({ title: "Rôle créé", description: "Le nouveau rôle a été créé avec succès." });
      setIsCreateDialogOpen(false);
      await refetch();
    } catch {
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    }
    setMutationInProgress(false);
  };

  const handleUpdateRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMutationInProgress(true);
    const formData = new FormData(e.currentTarget);
    const role_name = formData.get('role_name') as string;

    try {
      await updateRole({
        variables: { updateRoleInput: { id: roleToEdit!.id, role_name } },
      });
      toast({ title: "Rôle mis à jour", description: "Le rôle a été modifié avec succès." });
      setIsEditDialogOpen(false);
      await refetch();
    } catch {
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    }
    setMutationInProgress(false);
  };

  const handleDeleteRole = async () => {
    setMutationInProgress(true);
    try {
      await deleteRole({ variables: { id: roleToDelete!.id } });
      toast({ title: "Rôle supprimé", description: "Le rôle a été supprimé." });
      await refetch();
    } catch {
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    }
    setRoleToDelete(null);
    setMutationInProgress(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Liste des rôles</h3>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom du rôle</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(3)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-6 w-3/4" /></TableCell>
                  <TableCell className="flex space-x-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mutationInProgress && <Progress value={50} />}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Liste des rôles</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un rôle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter un rôle</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div><Label>Nom du rôle</Label><Input name="role_name" required /></div>
              <Button type="submit">Créer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom du rôle</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>{role.role_name}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      onClick={() => { setRoleToEdit(role); setIsEditDialogOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" onClick={() => setRoleToDelete(role)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ce rôle ?</AlertDialogTitle>
                          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteRole}>Continuer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
