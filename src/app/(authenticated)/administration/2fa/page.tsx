'use client';

import { useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GENERATE_2FA_SECRET_MUTATION } from '@/graphql/user';
import { useToast } from "@/components/hooks/use-toast";

export default function Setup2FA() {
  const { toast } = useToast();
  const [generate2FASecret, { data: qrCodeData, loading }] = useMutation(GENERATE_2FA_SECRET_MUTATION);

  // Generating a secret replaces the current one, so it only happens on request.
  const handleGenerate2FA = async () => {
    try {
      await generate2FASecret();
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center">
          <CardTitle className="text-center">Configurer la vérification 2FA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <Button onClick={handleGenerate2FA} disabled={loading}>
              {loading ? 'Génération...' : 'Générer le QR Code'}
            </Button>
            {qrCodeData?.generate2FASecret && (
              <div className="mt-4">
                <img src={qrCodeData.generate2FASecret} alt="QR Code pour 2FA" className="mx-auto" />
                <p className="mt-2">Scannez ce QR code avec votre authentificateur.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
