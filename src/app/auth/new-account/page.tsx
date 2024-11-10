'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { gql, useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { CONFIRM_EMAIL_AND_SET_PASSWORD } from '@/graphql/user';

export default function ConfirmEmailPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [confirmEmailAndSetPassword, { loading }] = useMutation(CONFIRM_EMAIL_AND_SET_PASSWORD);

  const token = searchParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      await confirmEmailAndSetPassword({
        variables: {
          token,
          password,
        },
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (error) {
      setError('Le lien est invalide ou a expiré.');
    }
  };

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
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert variant="default" className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Succès</AlertTitle>
              <AlertDescription>
                Votre compte a été créé avec succès ! Vous allez être redirigé vers la page de connexion.
              </AlertDescription>
            </Alert>
          )}
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
              {loading ? 'Confirmation en cours...' : 'Confirmer'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
