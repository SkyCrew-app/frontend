'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { RESET_PASSWORD } from '@/graphql/user';
import { newPasswordError } from '@/lib/password';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useToast } from "@/components/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Skeleton } from "@/components/ui/skeleton";

function ResetPasswordComponent() {
  const token = useSearchParams().get('token');
  const [resetPassword] = useMutation(RESET_PASSWORD);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = newPasswordError(password, confirmPassword);
    if (problem || !token) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: problem ?? "Ce lien de réinitialisation est incomplet.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword({ variables: { token, newPassword: password } });
      setSuccess(true);
      toast({
        title: "Succès",
        description: "Votre mot de passe a été réinitialisé avec succès.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          error instanceof Error && error.message
            ? error.message
            : "Une erreur est survenue lors de la réinitialisation du mot de passe.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return isLoading ? (
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
  ) : (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center">
          <CardTitle className="text-center">Réinitialiser le mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <p className="text-center">
                Votre mot de passe a été réinitialisé avec succès.
              </p>
              <Link href="/" passHref>
                <Button className="w-full">Retour à la page de connexion</Button>
              </Link>
            </div>
          ) : !token ? (
            <div className="space-y-4">
              <p className="text-center">
                Ce lien de réinitialisation est incomplet. Demandez-en un nouveau.
              </p>
              <Link href="/auth/forgot-password" passHref>
                <Button className="w-full">Demander un nouveau lien</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Votre nouveau mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirmez votre mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Skeleton className="h-5 w-20 mx-auto" /> : 'Réinitialiser le mot de passe'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordComponent />
    </Suspense>
  );
}
