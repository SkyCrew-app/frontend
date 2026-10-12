'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { CheckCircle2, Link2Off, Loader2 } from 'lucide-react';
import { RESET_PASSWORD } from '@/graphql/user';
import { PASSWORD_MIN_LENGTH, newPasswordError } from '@/lib/password';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/hooks/use-toast";
import { AuthCard, AuthCardSkeleton, AuthLink, FieldError } from '@/app/auth/_components/AuthCard';

function ResetPasswordComponent() {
  const token = useSearchParams().get('token');
  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = newPasswordError(password, confirmPassword);
    setFormError(problem);
    if (problem || !token) return;

    try {
      await resetPassword({ variables: { token, newPassword: password } });
      setSuccess(true);
    } catch {
      toast({
        variant: "destructive",
        title: "Réinitialisation impossible",
        description: "Ce lien est invalide ou a expiré. Demandez-en un nouveau.",
      });
    }
  };

  if (success) {
    return (
      <AuthCard
        icon={CheckCircle2}
        tone="success"
        title="Mot de passe modifié"
        description="Vous pouvez maintenant vous connecter avec votre nouveau mot de passe."
      >
        <Button asChild className="w-full">
          <Link href="/">Se connecter</Link>
        </Button>
      </AuthCard>
    );
  }

  if (!token) {
    return (
      <AuthCard
        icon={Link2Off}
        tone="warning"
        title="Lien incomplet"
        description="Ce lien de réinitialisation est incomplet. Demandez-en un nouveau."
        footer={<AuthLink href="/">Retour à la connexion</AuthLink>}
      >
        <Button asChild className="w-full">
          <Link href="/auth/forgot-password">Demander un nouveau lien</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Nouveau mot de passe"
      description="Choisissez le mot de passe que vous utiliserez pour vous connecter."
      footer={<AuthLink href="/">Retour à la connexion</AuthLink>}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!formError}
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            Au moins {PASSWORD_MIN_LENGTH} caractères.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={!!formError}
            aria-describedby={formError ? "password-error" : undefined}
          />
          <FieldError id="password-error">{formError}</FieldError>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Enregistrer le mot de passe
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <ResetPasswordComponent />
    </Suspense>
  );
}
