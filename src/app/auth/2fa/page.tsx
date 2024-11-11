'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/components/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useMutation, useQuery } from '@apollo/client';
import { GET_EMAIL_QUERY, GENERATE_2FA_SECRET_MUTATION } from '@/graphql/user';

export default function Setup2FA() {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const { data: emailData, loading: emailLoading } = useQuery(GET_EMAIL_QUERY, {
    fetchPolicy: 'network-only',
  });

  const [generate2FASecret] = useMutation(GENERATE_2FA_SECRET_MUTATION);

  useEffect(() => {
    setTimeout(() => setIsPageLoading(false), 1000);
  }, []);

  useEffect(() => {
    if (emailData && emailData.getEmailFromCookie) {
      handleGenerate2FA(emailData.getEmailFromCookie);
    }
  }, [emailData]);

  const handleGenerate2FA = async (email: string) => {
    setIsGenerating(true);
    try {
      const response = await generate2FASecret({ variables: { email } });
      setQrCodeUrl(response.data.generate2FASecret);
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
    } finally {
      setIsGenerating(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mx-auto" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-4" />
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center">
          <CardTitle className="text-center">Configurer la vérification 2FA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            {emailLoading ? (
              <Skeleton className="h-10 w-full mb-4" />
            ) : (
              <>
                <Button
                  onClick={() => handleGenerate2FA(emailData.getEmailFromCookie)}
                  disabled={isGenerating}
                >
                  {isGenerating ? <Skeleton className="h-5 w-20 mx-auto" /> : 'Générer le QR Code'}
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
      <Toaster />
    </div>
  );
}
