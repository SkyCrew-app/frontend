'use client';

import { useMutation } from '@apollo/client';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LOGIN_MUTATION } from '@/graphql/system';
import { useToast } from "@/components/hooks/use-toast";
import { loginSchema } from '@/lib/validations';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [login, { loading }] = useMutation(LOGIN_MUTATION);
  const { toast } = useToast();

  useEffect(() => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        errors[field] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    try {
      const response = await login({ variables: { email, password } });
      const { access_token, is2FAEnabled } = response.data.login;

      document.cookie = `token=${access_token}; path=/`;

      toast({
        title: "Connexion réussie",
        description: is2FAEnabled ? "Redirection vers la 2FA..." : "Redirection vers le tableau de bord...",
      });

      if (is2FAEnabled) {
        sessionStorage.setItem('2fa_pending_email', email);
        router.push('/auth/2fa');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: "Identifiants incorrects.",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center">
          <CardTitle className="text-center">Connexion à SkyCrew</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className="mt-1 text-sm text-destructive">{fieldErrors.email}</p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
              />
              {fieldErrors.password && (
                <p id="password-error" className="mt-1 text-sm text-destructive">{fieldErrors.password}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
          <div className="text-center mt-4">
            <Link href="/auth/forgot-password" passHref>
              <Button variant="link">Mot de passe oublié ?</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
