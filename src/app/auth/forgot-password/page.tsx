'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/hooks/use-toast";
import { useMutation } from '@apollo/client';
import { REQUEST_PASSWORD_RESET } from '@/graphql/user';
import { forgotPasswordSchema } from '@/lib/validations';
import { AuthCard, AuthLink, FieldError } from '@/app/auth/_components/AuthCard';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const [requestPasswordReset, { loading }] = useMutation(REQUEST_PASSWORD_RESET);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!result.success) {
      setEmailError(result.error.issues[0].message);
      return;
    }
    setEmailError(null);

    try {
      // The API answers the same whether or not the address has an account.
      await requestPasswordReset({ variables: { email: email.trim() } });
      setSuccess(true);
    } catch {
      toast({
        variant: "destructive",
        title: "Envoi impossible",
        description: "La demande n'a pas pu être envoyée. Réessayez dans un instant.",
      });
    }
  };

  if (success) {
    return (
      <AuthCard
        icon={MailCheck}
        tone="success"
        title="Consultez votre messagerie"
        description={`Si un compte existe pour ${email.trim()}, un e-mail de réinitialisation vient d'être envoyé. Son lien est valable une heure.`}
      >
        <Button asChild className="w-full">
          <Link href="/">Retour à la connexion</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Mot de passe oublié"
      description="Indiquez votre adresse e-mail pour recevoir un lien de réinitialisation."
      footer={<AuthLink href="/">Retour à la connexion</AuthLink>}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="prenom.nom@exemple.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "email-error" : undefined}
          />
          <FieldError id="email-error">{emailError}</FieldError>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Envoyer le lien
        </Button>
      </form>
    </AuthCard>
  );
}
