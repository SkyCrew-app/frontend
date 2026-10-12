'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@apollo/client';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/PageHeader';
import { CONFIRM_2FA_MUTATION, GENERATE_2FA_SECRET_MUTATION } from '@/graphql/user';
import { useToast } from "@/components/hooks/use-toast";

const CODE_LENGTH = 6;

export default function Setup2FA() {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [isActivated, setIsActivated] = useState(false);
  const [generate2FASecret, { data: qrCodeData, loading: generating }] = useMutation(GENERATE_2FA_SECRET_MUTATION);
  const [confirm2FA, { loading: confirming }] = useMutation(CONFIRM_2FA_MUTATION);

  // Generating a secret only prepares the setup: two-factor is activated
  // once a first code proves the authenticator app holds the secret.
  const handleGenerate2FA = async () => {
    try {
      await generate2FASecret();
      setCode('');
      toast({
        title: "QR code généré",
        description: "Scannez-le avec votre application d'authentification.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Génération impossible",
        description: "Le QR code n'a pas pu être généré. Réessayez dans un instant.",
      });
    }
  };

  const handleConfirm2FA = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await confirm2FA({ variables: { token: code } });
      setIsActivated(true);
      toast({
        title: "Double authentification activée",
        description: "Un code vous sera demandé à chaque connexion.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Code incorrect",
        description: "Le code saisi n'est pas valide. Vérifiez votre application et réessayez.",
      });
    }
  };

  const qrCode = qrCodeData?.generate2FASecret;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Authentification à deux facteurs"
        description="Protégez votre compte : en plus du mot de passe, un code à 6 chiffres vous sera demandé à chaque connexion."
        className="mb-0"
        actions={
          <Button asChild variant="outline">
            <Link href="/profile">Retour au profil</Link>
          </Button>
        }
      />

      {isActivated ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">Votre compte est protégé</CardTitle>
              <Badge variant="success">Activée</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground" role="status">
              L&apos;authentification à deux facteurs est active. Un code de votre application d&apos;authentification
              vous sera demandé à chaque connexion.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg">1. Scanner le QR code</CardTitle>
                <Badge variant={qrCode ? 'warning' : 'neutral'}>
                  {qrCode ? 'En attente du code' : 'QR code à générer'}
                </Badge>
              </div>
              <CardDescription>
                Installez une application d&apos;authentification sur votre téléphone (Google Authenticator, Microsoft
                Authenticator, Authy…), puis générez un QR code et scannez-le avec cette application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {qrCode && (
                // eslint-disable-next-line @next/next/no-img-element -- data URL returned by the API
                <img
                  src={qrCode}
                  alt="QR code à scanner avec votre application d'authentification"
                  className="h-48 w-48 rounded-md border"
                />
              )}
              <Button onClick={handleGenerate2FA} disabled={generating} variant={qrCode ? 'outline' : 'default'}>
                {generating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {qrCode ? 'Générer un nouveau QR code' : 'Générer le QR code'}
              </Button>
            </CardContent>
          </Card>

          {qrCode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. Saisir le code affiché</CardTitle>
                <CardDescription>
                  Saisissez le code à 6 chiffres affiché par l&apos;application pour activer la double authentification.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleConfirm2FA} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="two-factor-code">Code de vérification</Label>
                    <Input
                      id="two-factor-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      maxLength={CODE_LENGTH}
                      className="max-w-[12rem] tabular-nums tracking-widest"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <Button type="submit" disabled={code.length !== CODE_LENGTH || confirming}>
                    {confirming && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    Activer la double authentification
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
