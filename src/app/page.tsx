'use client';

import { useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { LOGIN_MUTATION } from '@/graphql/system';
import { GET_ME } from '@/graphql/user';
import { useToast } from "@/components/hooks/use-toast";
import { loginSchema } from '@/lib/validations';
import { clearSessionCache } from '@/lib/apollo-client';
import { AuthCard, AuthLink, FieldError } from '@/app/auth/_components/AuthCard';

const DEMO_ACCOUNTS = [
  { label: 'Admin démo', email: 'demo@skycrew.fr', password: 'demo1234' },
  { label: 'Pilote démo', email: 'jean.dupont@skycrew.fr', password: 'demo1234' },
  { label: 'Instructeur démo', email: 'marie.laurent@skycrew.fr', password: 'demo1234' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [login, { loading }] = useMutation(LOGIN_MUTATION);
  const { toast } = useToast();
  const { data: meData } = useQuery(GET_ME, {
    fetchPolicy: 'network-only',
  });
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  useEffect(() => {
    if (meData?.me?.email) {
      router.push('/dashboard');
    }
  }, [meData, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        // Keep the first issue of a field: "required" comes before "invalid".
        errors[field] ??= issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    try {
      const response = await login({ variables: { email, password } });
      const { is2FAEnabled } = response.data.login;
      // Nothing cached by a previous account on this browser is kept.
      await clearSessionCache();

      toast(
        is2FAEnabled
          ? { title: "Code de vérification requis", description: "Saisissez le code de votre application d'authentification." }
          : { title: "Connexion réussie", description: "Ouverture du tableau de bord…" },
      );

      if (is2FAEnabled) {
        sessionStorage.setItem('2fa_pending_email', email);
        router.push('/auth/2fa');
      } else {
        router.push('/dashboard');
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: "Identifiants incorrects.",
      });
    }
  };

  const applyDemoCredentials = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setFieldErrors({});
  };

  return (
    <AuthCard
      title="Connexion"
      description="Connectez-vous à votre espace SkyCrew."
      footer={<AuthLink href="/auth/forgot-password">Mot de passe oublié ?</AuthLink>}
    >
      {/* Validation is done here, with messages in French under each field. */}
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
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
          <FieldError id="email-error">{fieldErrors.email}</FieldError>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
          />
          <FieldError id="password-error">{fieldErrors.password}</FieldError>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Se connecter
        </Button>
      </form>
      {isDemoMode && (
        <div className="mt-6 space-y-3 rounded-lg border border-border bg-muted/40 p-4">
          <div>
            <p className="text-sm font-medium">Accès démo</p>
            <p className="text-xs text-muted-foreground">
              Choisissez un compte pour remplir le formulaire et explorer le site en lecture seule.
            </p>
          </div>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => applyDemoCredentials(account.email, account.password)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="text-sm font-medium">{account.label}</p>
                <p className="text-xs text-muted-foreground">{account.email}</p>
                <p className="text-xs text-muted-foreground">Mot de passe : {account.password}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthCard>
  );
}
