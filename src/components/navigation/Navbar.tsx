'use client';

import React from 'react';
import { useRouter } from 'next/navigation'; // Pour la redirection
import { gql, useMutation } from '@apollo/client'; // Pour la mutation GraphQL
import { Bell } from 'lucide-react';
import ToggleThemeButton from '../ui/ToggleThemeButton';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

// Mutation GraphQL pour la déconnexion
const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

export default function Navbar() {
  const router = useRouter();
  const [logout] = useMutation(LOGOUT_MUTATION);

  const handleLogout = async () => {
    try {
      // Appelle la mutation de déconnexion côté backend
      await logout();

      // Supprimer également toute donnée de localStorage si nécessaire
      localStorage.removeItem('token');

      // Rediriger vers la page de login après déconnexion
      router.push('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <header className="flex items-center justify-end p-4 border-b bg-background space-x-3">
      {/* Bouton de basculement de thème */}
      <ToggleThemeButton />

      {/* Dropdown de notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative">
            <Bell className="h-5 w-5" />
            {/* Indicateur de notification */}
            <span className="absolute top-0 right-0 inline-flex items-center justify-center h-4 w-4 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
              3
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem>Nouvelles réservations</DropdownMenuItem>
          <DropdownMenuItem>Maintenance à prévoir</DropdownMenuItem>
          <DropdownMenuItem>Messages des instructeurs</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Menu utilisateur */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src="/path/to/user/avatar.jpg" alt="User Avatar" />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Mon Profil</DropdownMenuItem>
          <DropdownMenuItem>Paramètres</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
