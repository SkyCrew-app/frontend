'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Bell } from 'lucide-react';
import {jwtDecode} from 'jwt-decode';
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
import { GET_USER_PROFILE } from '@/graphql/user';
import { LOGOUT_MUTATION } from '@/graphql/system';

export default function Navbar() {
  const router = useRouter();
  const [logout] = useMutation(LOGOUT_MUTATION);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [initials, setInitials] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [userAccountBalance, setUserAccountBalance] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode<{ email: string }>(token);
        setUserEmail(decodedToken.email);
      } catch (error) {
        console.error('Erreur lors du décodage du token:', error);
      }
    }
  }, []);

  const { data, loading, error } = useQuery(GET_USER_PROFILE, {
    variables: { email: userEmail },
    skip: !userEmail,
  });

  useEffect(() => {
    if (data && data.userByEmail) {
      const { first_name, last_name, profile_picture, user_account_balance } = data.userByEmail;
      setInitials(`${first_name[0]}${last_name[0]}`);
      setUserAccountBalance(user_account_balance);
      if (profile_picture) {
        setProfilePicture(profile_picture);
      }
    }
  }, [data]);

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('token');
      router.push('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const handleProfile = () => {
    router.push('/profile/');
  };

  const handleAmount = () => {
    router.push('/profile/money_account');
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur lors du chargement des informations utilisateur.</div>;

  return (
    <header className="w-full flex items-center justify-end p-4 border-b bg-gray-50 dark:bg-gray-800 space-x-3">
      {/* Bouton de basculement de thème */}
      <ToggleThemeButton />

      {/* Dropdown de notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative">
            <Bell className="h-5 w-5" />
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
            {profilePicture ? (
              <AvatarImage src={`http://localhost:3000${profilePicture}`} alt="User Avatar" />
            ) : (
              <AvatarFallback>{initials}</AvatarFallback>
            )}
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleProfile}>Mon Profil</DropdownMenuItem>
          <DropdownMenuItem onClick={handleAmount}>Mon Solde: { userAccountBalance } €</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
