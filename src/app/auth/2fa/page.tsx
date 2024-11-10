'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TwoFAPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const router = useRouter();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!canResend) {
      interval = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }

    if (countdown === 0) {
      setCanResend(true);
      setCountdown(30);
    }

    return () => clearInterval(interval);
  }, [canResend, countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setError('Veuillez saisir le code de vérification.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      router.push('/dashboard');
    } catch (err) {
      setError('Code incorrect ou erreur de validation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = () => {
    if (!canResend) return;
    setResendSuccess(true);
    setCanResend(false);
    setTimeout(() => setResendSuccess(false), 5000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center">
          <CardTitle className="text-center">Vérification en deux étapes</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {resendSuccess && (
            <Alert variant="default" className="mb-4">
              <AlertTitle>Succès</AlertTitle>
              <AlertDescription>Un nouveau code a été envoyé.</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-center">
              Un code de vérification a été envoyé à votre appareil.
            </p>
            <div>
              <Input
                id="code"
                type="text"
                placeholder="Entrez le code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Vérification en cours...' : 'Vérifier'}
            </Button>
          </form>
          <div className="text-center mt-4">
            <Button
              variant="link"
              onClick={handleResendCode}
              disabled={!canResend}
            >
              {canResend ? 'Renvoyer le code' : `Renvoyer dans ${countdown}s`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
