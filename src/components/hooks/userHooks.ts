import { useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { toast } from '@/components/hooks/use-toast';
import { GET_USER_BY_EMAIL } from '@/graphql/user';
import { GET_ME } from '@/graphql/user';
import i18n from '@/lib/i18n';

export function useCurrentUser() {
  const { data, error } = useQuery(GET_ME);

  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: i18n.t('auth:session.loadFailed.title'),
        description: i18n.t('auth:session.loadFailed.description'),
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
        title: i18n.t('auth:session.loadFailed.title'),
        description: i18n.t('auth:session.loadFailed.description'),
      });
    }
  }, [error]);

  return data?.userByEmail || null;
}
