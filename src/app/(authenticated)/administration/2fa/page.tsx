'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        title: "QR Code généré",
        description: "Veuillez scanner le QR code avec votre application d'authentification.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de la génération du 2FA.",
      });
    }
  };

  const handleConfirm2FA = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await confirm2FA({ variables: { token: code } });
      setIsActivated(true);
      toast({
        title: "2FA activée",
        description: "L'authentification à deux facteurs est maintenant active sur votre compte.",
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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center">
          <CardTitle className="text-center">Configurer la vérification 2FA</CardTitle>
        </CardHeader>
        <CardContent>
          {isActivated ? (
            <p className="text-center" role="status">
              L&apos;authentification à deux facteurs est active. Un code vous sera demandé à chaque connexion.
            </p>
          ) : (
            <div className="text-center">
              <Button onClick={handleGenerate2FA} disabled={generating}>
                {generating ? 'Génération...' : 'Générer le QR Code'}
              </Button>
              {qrCode && (
                <div className="mt-4 space-y-4">
                  <img src={qrCode} alt="QR Code pour 2FA" className="mx-auto" />
                  <p>Scannez ce QR code avec votre authentificateur, puis saisissez le code affiché pour activer la 2FA.</p>
                  <form onSubmit={handleConfirm2FA} className="space-y-3 text-left">
                    <Label htmlFor="two-factor-code">Code de vérification</Label>
                    <Input
                      id="two-factor-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={CODE_LENGTH}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    />
                    <Button type="submit" className="w-full" disabled={code.length !== CODE_LENGTH || confirming}>
                      {confirming ? 'Vérification...' : 'Activer la 2FA'}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
