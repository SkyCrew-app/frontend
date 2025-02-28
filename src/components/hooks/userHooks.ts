import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { toast } from '@/components/hooks/use-toast';
import { GET_USER_BY_EMAIL } from '@/graphql/user';
import { GET_ME } from '@/graphql/user';

export function useCurrentUser() {
  const { data, error, loading } = useQuery(GET_ME);

  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la récupération des données',
        description: "Une erreur est survenue lors de la récupération des informations de l'utilisateur.",
      });
    }
  }, [error]);

  return data?.me.email || null;
}

export function useUserData(email: string | null) {
  const { data, error } = useQuery(GET_USER_BY_EMAIL, {
    variables: { email: email || '' },
    skip: !email,
  });

  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la récupération des données',
        description: "Une erreur est survenue lors de la récupération des informations de l'utilisateur.",
      });
    }
  }, [error]);

  return data?.userByEmail || null;
}
