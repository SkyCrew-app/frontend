'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { CheckCircle2, Link2Off, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/hooks/use-toast";
import { CONFIRM_EMAIL_AND_SET_PASSWORD } from '@/graphql/user';
import { PASSWORD_MIN_LENGTH, newPasswordError } from '@/lib/password';
import { AuthCard, AuthCardSkeleton, AuthLink, FieldError } from '@/app/auth/_components/AuthCard';

function ConfirmEmailComponent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [confirmEmailAndSetPassword, { loading }] = useMutation(CONFIRM_EMAIL_AND_SET_PASSWORD);

  const validation_token = searchParams.get('token');

  // Once the account is active, the sign-in page opens by itself.
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => router.push('/'), 3000);
    return () => clearTimeout(timer);
  }, [success, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const problem = newPasswordError(password, confirmPassword);
    setFormError(problem);
    if (problem || !validation_token) return;

    try {
      await confirmEmailAndSetPassword({
        variables: {
          validation_token,
          password,
        },
      });
      setSuccess(true);
    } catch {
      toast({
        variant: "destructive",
        title: "Activation impossible",
        description: "Ce lien est invalide ou a expiré. Demandez une nouvelle invitation à votre club.",
      });
    }
  };

  if (success) {
    return (
      <AuthCard
        icon={CheckCircle2}
        tone="success"
        title="Compte activé"
        description="Votre mot de passe est enregistré. La page de connexion va s'ouvrir."
      >
        <Button asChild className="w-full">
          <Link href="/">Se connecter</Link>
        </Button>
      </AuthCard>
    );
  }

  if (!validation_token) {
    return (
      <AuthCard
        icon={Link2Off}
        tone="warning"
        title="Lien incomplet"
        description="Ce lien d'activation est incomplet. Ouvrez-le depuis l'e-mail d'invitation ou demandez-en un nouveau à votre club."
        footer={<AuthLink href="/">Retour à la connexion</AuthLink>}
      />
    );
  }

  return (
    <AuthCard
      title="Activer votre compte"
      description="Choisissez votre mot de passe pour terminer la création de votre compte."
      footer={<AuthLink href="/">Retour à la connexion</AuthLink>}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
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
          Activer mon compte
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <ConfirmEmailComponent />
    </Suspense>
  );
}
