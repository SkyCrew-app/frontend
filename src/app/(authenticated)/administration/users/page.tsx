'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fr } from "date-fns/locale";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { CREATE_USER, GET_USERS, UPDATE_USER, GET_USER_DETAILS } from "@/graphql/user";
import { CREATE_LICENSE } from "@/graphql/licences";
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string;
  is2FAEnabled: boolean;
  isEmailConfirmed: boolean;
  phone_number: string;
  // roles: Role[] | null;
}

// interface Role {
//   role_name: string;
// }

interface UserDetails extends User {
  phone_number: string;
  address: string;
  total_flight_hours: number;
  user_account_balance: number;
  reservations: Reservation[];
  licenses: License[];
}

interface Reservation {
  id: string;
  start_time: string;
  end_time: string;
  aircraft: {
    registration_number: string;
    model: string;
  };
}

interface License {
  certification_authority: string;
  license_number: string;
  id: string;
  license_type: string;
  issue_date: string;
  expiration_date: string;
  documents_url: string[];
}

export default function AdministrationPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserDetails | null>(null);
  const [currentReservationPage, setCurrentReservationPage] = useState(1);
  const [currentLicensePage, setCurrentLicensePage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [issueDate, setIssueDate] = useState<Date | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const itemsPerPage = 3;
  const [usersPerPage] = useState(10);
  const [open, setOpen] = useState(false);


  const { toast } = useToast();

  const { loading, error, data, refetch } = useQuery(GET_USERS, {
    onCompleted: (data) => {
      setUsers(data.getUsers || []);
    },
    fetchPolicy: "cache-and-network",
  });
  const [createUser] = useMutation(CREATE_USER);
  const [updateUser] = useMutation(UPDATE_USER);
  const [onAddLicense] = useMutation(CREATE_LICENSE);
  const [getUserDetails] = useLazyQuery<{ getUserDetails: UserDetails }>(GET_USER_DETAILS);

  useEffect(() => {
    if (data?.getUsers) {
      setUsers(data.getUsers);
    }
  }, [data]);

  const handleCreateUser = async (userData: { first_name: string; last_name: string; email: string; date_of_birth: string }) => {
    try {
      await createUser({ variables: userData });
      toast({ title: "Utilisateur créé avec succès" , description: "L'utilisateur va recevoir un email pour confirmer son compte." });
      setIsCreateDialogOpen(false);
      refetch();
    } catch (error) {
      if (error instanceof Error) {
        toast({ title: "Erreur lors de la création de l'utilisateur", description: error.message, variant: "destructive" });
      }
    }
  };

  const handleUpdateUser = async (userData: { first_name: string; last_name: string; email: string; date_of_birth: string; phone_number: string }) => {
    try {
      await updateUser({ variables: { updateUserInput: userData } });
      toast({ title: "Utilisateur mis à jour avec succès" });
      setIsEditDialogOpen(false);
      refetch();
    } catch (error) {
      if (error instanceof Error) {
        toast({ title: "Erreur lors de la mise à jour de l'utilisateur", description: error.message, variant: "destructive" });
      }
    }
  };

  const handleViewDetails = (userId: string) => {
    getUserDetails({
      variables: { id: userId },
      onCompleted: (data) => {
        setSelectedUserDetails(data.getUserDetails);
        setIsDetailsDialogOpen(true);
      },
      onError: () => {
        toast({
          title: "Erreur",
          description: "Impossible de charger les détails de l'utilisateur.",
          variant: "destructive"
        });
      }
    });
  };

  const handleSubmitLicences = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    if (!selectedUserId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un utilisateur.",
        variant: "destructive"
      });
      return;
    }

    const files = formData.getAll("documents") as File[];
    const validFiles = files.filter((file) => file);

    onAddLicense({
      variables: {
        createLicenseInput: {
          user_id: parseInt(selectedUserId),
          license_type: formData.get("license_type") as string,
          license_number: formData.get("license_number") as string,
          expiration_date: expirationDate?.toISOString(),
          issue_date: issueDate?.toISOString(),
          certification_authority: formData.get("certification_authority") as string || null,
          status: formData.get("status") as string || "active",
        },
        documents: validFiles.length > 0 ? validFiles : null,
      },
    })
      .then(() => {
        toast({ title: "Licence ajoutée avec succès" });
        setIsDialogOpen(false);
      })
      .catch((error) => {
        if (error instanceof Error) {
          toast({ title: "Erreur lors de l'ajout de la licence", description: error.message, variant: "destructive" });
        }
      });
  };

  const filteredUsers = users.filter(user =>
    (user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedReservations = selectedUserDetails?.reservations.slice(
    (currentReservationPage - 1) * itemsPerPage,
    currentReservationPage * itemsPerPage
  );

  const paginatedLicenses = selectedUserDetails?.licenses.slice(
    (currentLicensePage - 1) * itemsPerPage,
    currentLicensePage * itemsPerPage
  );

  const handleExpirationDateChange = (date: Date | undefined) => {
    if (date && issueDate && date < issueDate) {
      toast({
        title: "Erreur",
        description: "La date d'expiration ne peut pas être antérieure à la date d'émission.",
        variant: "destructive"
      });
      return;
    }
    setExpirationDate(date ?? null);
  };

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) return <Skeleton className="w-full h-96" />;
  if (error) {
    toast({
      title: "Erreur",
      description: "Une erreur est survenue lors du chargement des utilisateurs.",
      variant: "destructive"
    });
  }

  return (
        <>
        <div className="flex flex-col items-center justify-center p-3 dark:text-white overflow-hidden">
        <h1 className="text-3xl font-bold mb-8">Gestion des membres</h1>
        </div>
        <div className="flex justify-between mb-4">
      <Input
        placeholder="Rechercher un utilisateur..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm" />
      <div className="flex space-x-2">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Ajouter un utilisateur</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un nouvel utilisateur</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              handleCreateUser({
                first_name: formData.get('first_name') as string,
                last_name: formData.get('last_name') as string,
                email: formData.get('email') as string,
                date_of_birth: formData.get('date_of_birth') as string,
              });
            } }>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="first_name" className="text-right">
                    Prénom
                  </Label>
                  <Input id="first_name" name="first_name" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="last_name" className="text-right">
                    Nom
                  </Label>
                  <Input id="last_name" name="last_name" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input id="email" name="email" type="email" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date_of_birth" className="text-right">
                    Date de naissance
                  </Label>
                  <Input id="date_of_birth" name="date_of_birth" type="date" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Ajouter</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
              Ajouter une licence
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg p-6 rounded-lg shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Ajouter une nouvelle licence</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitLicences}>
              <div className="grid gap-4 py-4">

                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="user" className="text-right font-semibold">
                  Utilisateur
                </Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="col-span-3 justify-between"
                    >
                      {selectedUserId && users.length > 0
                        ? users.find((user) => user.id === selectedUserId)?.email ?? "Sélectionnez un utilisateur..."
                        : "Sélectionnez un utilisateur..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    {loading ? (
                      <Skeleton className="w-full h-16" />
                    ) : users.length > 0 ? (
                      <Command>
                        <CommandInput placeholder="Rechercher un utilisateur..." />
                        <CommandEmpty>Aucun utilisateur trouvé.</CommandEmpty>
                        <CommandGroup>
                          {users.map((user) => (
                            <CommandItem
                              key={String(user.id)}
                              onSelect={() => {
                                setSelectedUserId(user.id === selectedUserId ? null : user.id);
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedUserId === user.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {user.first_name} {user.last_name} ({user.email})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    ) : (
                      <CommandEmpty>Aucun utilisateur trouvé.</CommandEmpty>
                    )}
                  </PopoverContent>
                </Popover>
                  <Label htmlFor="license_type" className="text-right font-semibold">
                    Type de licence
                  </Label>
                  <Select name="license_type" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Sélectionnez le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PPL">PPL</SelectItem>
                      <SelectItem value="CPL">CPL</SelectItem>
                      <SelectItem value="ATPL">ATPL</SelectItem>
                      <SelectItem value="FI">FI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="license_number" className="text-right font-semibold">
                    Numéro de licence
                  </Label>
                  <Input
                    id="license_number"
                    name="license_number"
                    className="col-span-3"
                    placeholder="Numéro de licence"
                    required
                  />
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="issue_date" className="text-right font-semibold">
                      Date d'émission
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="col-span-3 w-full text-left">
                          {issueDate
                            ? format(issueDate, "PPP", { locale: fr })
                            : "Choisissez une date"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={issueDate ?? undefined}
                          onSelect={(date) => setIssueDate(date ?? null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="expiration_date" className="text-right font-semibold">
                      Date d'expiration
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="col-span-3 w-full text-left">
                          {expirationDate
                            ? format(expirationDate, "PPP", { locale: fr })
                            : "Choisissez une date"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={expirationDate ?? undefined}
                          onSelect={handleExpirationDateChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="certification_authority" className="text-right font-semibold">
                    Autorité de certification
                  </Label>
                  <Input
                    id="certification_authority"
                    name="certification_authority"
                    className="col-span-3 border border-gray-300 dark:border-gray-700 rounded-md"
                    placeholder="Autorité de certification" />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="documents" className="text-right font-semibold">
                    Documents
                  </Label>
                  <Input
                    id="documents"
                    name="documents"
                    type="file"
                    multiple
                    className="col-span-3 border border-gray-300 dark:border-gray-700 rounded-md"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right font-semibold">
                    Statut
                  </Label>
                  <Select name="status" defaultValue="active">
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Sélectionnez le statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expirée</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-primary text-white hover:bg-primary-dark">
                  Ajouter
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div><Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Date de naissance</TableHead>
            {/* <TableHead>Rôles</TableHead> */}
            <TableHead>2FA</TableHead>
            <TableHead>Email confirmé</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{`${user.first_name} ${user.last_name}`}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{new Date(user.date_of_birth).toLocaleDateString()}</TableCell>
              {/* <TableCell>{user.roles?.map(role => role.role_name).join(', ') ?? 'Aucun rôle'}</TableCell> */}
              <TableCell>
                <Checkbox
                  checked={user.is2FAEnabled}
                  disabled />
              </TableCell>
              <TableCell>{user.isEmailConfirmed ? 'Oui' : 'Non'}</TableCell>
              <TableCell>
                <Button variant="outline" className="mr-2" onClick={() => {
                  setSelectedUser(user);
                  setIsEditDialogOpen(true);
                } }>
                  Modifier
                </Button>
                <Button variant="secondary" onClick={() => handleViewDetails(user.id)}>
                  Voir plus
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table><Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={() => paginate(currentPage - 1)} />
          </PaginationItem>
          {Array.from({ length: Math.ceil(filteredUsers.length / usersPerPage) }, (_, index) => (
            <PaginationItem key={index}>
              <PaginationLink onClick={() => paginate(index + 1)} isActive={currentPage === index + 1}>
                {index + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext onClick={() => paginate(currentPage + 1)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination><Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              handleUpdateUser({
                first_name: formData.get('first_name') as string,
                last_name: formData.get('last_name') as string,
                email: formData.get('email') as string,
                date_of_birth: formData.get('date_of_birth') as string,
                phone_number: formData.get('phone_number') as string,
              });
            } }>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_first_name" className="text-right">
                    Prénom
                  </Label>
                  <Input id="edit_first_name" name="first_name" defaultValue={selectedUser.first_name} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_last_name" className="text-right">
                    Nom
                  </Label>
                  <Input id="edit_last_name" name="last_name" defaultValue={selectedUser.last_name} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_email" className="text-right">
                    Email
                  </Label>
                  <Input id="edit_email" name="email" type="email" defaultValue={selectedUser.email} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_email" className="text-right">
                    Téléphone
                  </Label>
                  <Input id="edit_phone" name="phone_number" type="tel" defaultValue={selectedUser.phone_number} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_date_of_birth" className="text-right">
                    Date de naissance
                  </Label>
                  <Input id="edit_date_of_birth" name="date_of_birth" type="date" defaultValue={new Date(selectedUser.date_of_birth).toISOString().split('T')[0]} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Mettre à jour</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog><Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl p-6 rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Détails de l'utilisateur</DialogTitle>
          </DialogHeader>

          {selectedUserDetails ? (
            <Tabs defaultValue="personal-info" className="mt-4">
              <TabsList>
                <TabsTrigger value="personal-info" className="px-4 py-2 font-semibold text-sm">
                  Informations personnelles
                </TabsTrigger>
                <TabsTrigger value="reservations" className="px-4 py-2 font-semibold text-sm">
                  Réservations
                </TabsTrigger>
                <TabsTrigger value="licenses" className="px-4 py-2 font-semibold text-sm">
                  Licences
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal-info" className="space-y-4 min-h-[250px]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-bold">Nom complet :</p>
                    <p>{selectedUserDetails.first_name} {selectedUserDetails.last_name}</p>
                  </div>
                  <div>
                    <p className="font-bold">Email :</p>
                    <a className="underline" href={`mailto:${selectedUserDetails.email}`}>{selectedUserDetails.email}</a>
                  </div>
                  <div>
                    <p className="font-bold">Téléphone :</p>
                    <p>{selectedUserDetails.phone_number}</p>
                  </div>
                  <div>
                    <p className="font-bold">Adresse :</p>
                    <a className="underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedUserDetails.address)}`} rel="noopener noreferrer">
                      {selectedUserDetails.address}
                    </a>
                  </div>
                  <div>
                    <p className="font-bold">Date de naissance :</p>
                    <p>{new Date(selectedUserDetails.date_of_birth).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="font-bold">Heures de vol totales :</p>
                    <p>{selectedUserDetails.total_flight_hours} heures</p>
                  </div>
                  <div>
                    <p className="font-bold">Solde du compte :</p>
                    <p>{selectedUserDetails.user_account_balance} €</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reservations" className="space-y-4 min-h-[250px]">
                <Table className="border">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left border-b">Date de début</TableHead>
                      <TableHead className="text-left border-b">Date de fin</TableHead>
                      <TableHead className="text-left border-b">Avion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReservations?.map((reservation) => (
                      <TableRow key={reservation.id} className="border-b">
                        <TableCell>{new Date(reservation.start_time).toLocaleString()}</TableCell>
                        <TableCell>{new Date(reservation.end_time).toLocaleString()}</TableCell>
                        <TableCell>{reservation.aircraft.registration_number} - {reservation.aircraft.model}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Pagination className="flex justify-end">
                  <PaginationPrevious onClick={() => setCurrentReservationPage(currentReservationPage - 1)} />
                  {Array.from({ length: Math.ceil((selectedUserDetails?.reservations.length || 0) / itemsPerPage) }, (_, index) => (
                    <PaginationLink
                      onClick={() => setCurrentReservationPage(index + 1)}
                      isActive={currentReservationPage === index + 1}
                    >
                      {index + 1}
                    </PaginationLink>
                  ))}
                  <PaginationNext onClick={() => setCurrentReservationPage(currentReservationPage + 1)} />
                </Pagination>
              </TabsContent>

              <TabsContent value="licenses" className="space-y-4 min-h-[250px]">
                <Table className="border">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left border-b">Type de licence</TableHead>
                      <TableHead className="text-left border-b">Numéro</TableHead>
                      <TableHead className="text-left border-b">Autorité</TableHead>
                      <TableHead className="text-left border-b">Date d'émission</TableHead>
                      <TableHead className="text-left border-b">Date d'expiration</TableHead>
                      <TableHead className="text-left border-b">Statut</TableHead>
                      <TableHead className="text-left border-b">Documents</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLicenses?.map((license) => (
                      <TableRow key={license.id} className="border-b">
                        <TableCell>{license.license_type}</TableCell>
                        <TableCell>{license.license_number || 'Non spécifié'}</TableCell>
                        <TableCell>{license.certification_authority || 'Non spécifiée'}</TableCell>
                        <TableCell>{new Date(license.issue_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(license.expiration_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span
                            className={`${
                              license.expiration_date && new Date(license.expiration_date) < new Date()
                                ? 'text-red-500'
                                : 'text-green-500'
                            }`}
                          >
                            {license.expiration_date && new Date(license.expiration_date) < new Date()
                              ? 'Expirée'
                              : 'Valide'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {license.documents_url && license.documents_url.length > 0 ? (
                            <div className="flex flex-col space-y-2">
                              {license.documents_url.map((doc, index) => (
                                <a
                                  key={index}
                                  href={`http://localhost:3000${doc}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 underline"
                                >
                                  Document {index + 1}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500">Aucun document</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Pagination className="flex justify-end">
                  <PaginationPrevious
                    onClick={() =>
                      setCurrentLicensePage((prev) => Math.max(prev - 1, 1))
                    }
                  />
                  {Array.from(
                    {
                      length: Math.ceil(
                        (selectedUserDetails?.licenses.length || 0) / itemsPerPage
                      ),
                    },
                    (_, index) => (
                      <PaginationLink
                        key={index}
                        onClick={() => setCurrentLicensePage(index + 1)}
                        isActive={currentLicensePage === index + 1}
                      >
                        {index + 1}
                      </PaginationLink>
                    )
                  )}
                  <PaginationNext
                    onClick={() =>
                      setCurrentLicensePage((prev) =>
                        Math.min(
                          prev + 1,
                          Math.ceil(
                            (selectedUserDetails?.licenses.length || 0) / itemsPerPage
                          )
                        )
                      )
                    }
                  />
                </Pagination>
              </TabsContent>
            </Tabs>
          ) : (
            <Skeleton className="w-full h-64" />
          )}
        </DialogContent>
      </Dialog>
      </>
  );
}