'use client';

import { gql, useMutation, useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const GET_EMAIL_QUERY = gql`
  query GetEmailFromCookie {
    getEmailFromCookie
  }
`;

const GENERATE_2FA_SECRET_MUTATION = gql`
  mutation Generate2FASecret($email: String!) {
    generate2FASecret(email: $email)
  }
`;

export default function Setup2FA() {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [error, setError] = useState('');
  const { data: emailData, loading: emailLoading } = useQuery(GET_EMAIL_QUERY, {
    fetchPolicy: 'network-only',
  });
  const [generate2FASecret] = useMutation(GENERATE_2FA_SECRET_MUTATION);

  useEffect(() => {
    if (emailData && emailData.getEmailFromCookie) {
      handleGenerate2FA(emailData.getEmailFromCookie);
    }
  }, [emailData]);

  const handleGenerate2FA = async (email: string) => {
    try {
      const response = await generate2FASecret({ variables: { email } });
      setQrCodeUrl(response.data.generate2FASecret);
    } catch (err) {
      setError('Erreur lors de la génération du 2FA.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center">
          <CardTitle className="text-center">Configurer la vérification 2FA</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="text-center">
            {emailLoading ? (
              <p>Chargement...</p>
            ) : (
              <>
                <Button onClick={() => handleGenerate2FA(emailData.getEmailFromCookie)}>
                  Générer le QR Code
                </Button>
                {qrCodeUrl && (
                  <div className="mt-4">
                    <img src={qrCodeUrl} alt="QR Code pour 2FA" className="mx-auto" />
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
