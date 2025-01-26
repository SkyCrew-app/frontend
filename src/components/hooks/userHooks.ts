import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { jwtDecode } from 'jwt-decode';
import { toast } from '@/components/hooks/use-toast';
import { GET_USER_BY_EMAIL } from '@/graphql/user';

type TokenPayload = {
  email: string;
};

export function useDecodedToken() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode<TokenPayload>(token);
        setUserEmail(decodedToken.email);
      } catch (error) {
        console.error('Erreur lors du décodage du token:', error);
      }
    } else {
      console.log('Aucun token trouvé dans le localStorage.');
    }
  }, []);

  return userEmail;
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
