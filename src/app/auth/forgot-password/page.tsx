'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useToast } from "@/components/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation } from '@apollo/client';
import { REQUEST_PASSWORD_RESET } from '@/graphql/user';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [requestPasswordReset] = useMutation(REQUEST_PASSWORD_RESET);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez saisir votre adresse e-mail.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await requestPasswordReset({ variables: { email: email.trim() } });
      // The API answers the same whether or not the address has an account.
      toast({
        title: "Demande enregistrée",
        description: "Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d'être envoyé.",
      });
      setSuccess(true);
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi de l'e-mail.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center">
          <CardTitle className="text-center">Mot de passe oublié</CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <p className="text-center">
                Si un compte existe pour {email}, un e-mail de réinitialisation vient d&apos;être envoyé. Le lien
                qu&apos;il contient est valable une heure.
              </p>
              <Link href="/" passHref>
                <Button className="w-full">Retour à la page de connexion</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Button type="submit" className="w-full">
                  Réinitialiser le mot de passe
                </Button>
              )}
            </form>
          )}
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}