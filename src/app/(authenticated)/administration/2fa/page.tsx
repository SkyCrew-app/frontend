'use client';

import { useMutation, useQuery } from '@apollo/client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GET_EMAIL_QUERY, GENERATE_2FA_SECRET_MUTATION } from '@/graphql/user';
import { useToast } from "@/components/hooks/use-toast";

export default function Setup2FA() {
  const { toast } = useToast();
  const { data: emailData, loading: emailLoading } = useQuery(GET_EMAIL_QUERY, {
    fetchPolicy: 'network-only',
  });
  const [generate2FASecret, { data: qrCodeData }] = useMutation(GENERATE_2FA_SECRET_MUTATION);

  useEffect(() => {
    if (emailData && emailData.getEmailFromCookie) {
      handleGenerate2FA(emailData.getEmailFromCookie);
    }
  }, [emailData]);

  const handleGenerate2FA = async (email: string) => {
    try {
      await generate2FASecret({ variables: { email } });
      toast({
        title: "QR Code généré",
        description: "Veuillez scanner le QR code avec votre application d'authentification.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de la génération du 2FA.",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center">
          <CardTitle className="text-center">Configurer la vérification 2FA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            {emailLoading ? (
              <p>Chargement...</p>
            ) : (
              <>
                <Button onClick={() => handleGenerate2FA(emailData.getEmailFromCookie)}>
                  Générer le QR Code
                </Button>
                {qrCodeData && qrCodeData.generate2FASecret && (
                  <div className="mt-4">
                    <img src={qrCodeData.generate2FASecret} alt="QR Code pour 2FA" className="mx-auto" />
                    <p className="mt-2">Scannez ce QR code avec votre authentificateur.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}