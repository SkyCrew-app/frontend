'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/components/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { CONFIRM_EMAIL_AND_SET_PASSWORD } from '@/graphql/user';

export default function ConfirmEmailPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [confirmEmailAndSetPassword, { loading }] = useMutation(CONFIRM_EMAIL_AND_SET_PASSWORD);

  const validation_token = searchParams.get('token');

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
      });
      return;
    }

    try {
      await confirmEmailAndSetPassword({
        variables: {
          validation_token,
          password,
        },
      });
      toast({
        title: "Succès",
        description: "Votre compte a été créé avec succès ! Vous allez être redirigé vers la page de connexion.",
      });
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le lien est invalide ou a expiré.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mx-auto" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-4" />
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center">
          <CardTitle className="text-center">Confirmation de votre compte</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-6">
            Afin de finaliser la création de votre compte, veuillez définir un mot de passe en remplissant le formulaire ci-dessous.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                id="password"
                type="password"
                placeholder="Nouveau mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirmez le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Skeleton className="h-5 w-20 mx-auto" /> : 'Confirmer'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}