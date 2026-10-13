'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/layout/ErrorState';
import { DisableTwoFactorDialog } from '@/components/profile/disable-two-factor-dialog';
import {
  CONFIRM_2FA_MUTATION,
  GENERATE_2FA_SECRET_MUTATION,
  GET_TWO_FACTOR_STATUS,
} from '@/graphql/user';
import { useToast } from "@/components/hooks/use-toast";

const CODE_LENGTH = 6;

export default function Setup2FA() {
  const { t } = useTranslation('administration');
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [showDisable, setShowDisable] = useState(false);
  // Whether two-factor is already on comes from the API, never from this screen's own state.
  const statusQuery = useQuery(GET_TWO_FACTOR_STATUS, { fetchPolicy: 'cache-and-network' });
  const [generate2FASecret, { data: qrCodeData, loading: generating, reset: resetQrCode }] =
    useMutation(GENERATE_2FA_SECRET_MUTATION);
  const [confirm2FA, { loading: confirming }] = useMutation(CONFIRM_2FA_MUTATION, {
    refetchQueries: [{ query: GET_TWO_FACTOR_STATUS }],
    awaitRefetchQueries: true,
  });

  const isActivated: boolean | undefined = statusQuery.data?.twoFactorEnabled;
  const statusKnown = typeof isActivated === 'boolean';

  // Generating a secret only prepares the setup: two-factor is activated
  // once a first code proves the authenticator app holds the secret.
  const handleGenerate2FA = async () => {
    try {
      await generate2FASecret();
      setCode('');
      toast({
        title: t('twoFactor.toast.generated.title'),
        description: t('twoFactor.toast.generated.description'),
      });
    } catch {
      toast({
        variant: "destructive",
        title: t('twoFactor.toast.generateFailed.title'),
        description: t('twoFactor.toast.generateFailed.description'),
      });
    }
  };

  const handleConfirm2FA = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await confirm2FA({ variables: { token: code } });
      toast({
        title: t('twoFactor.toast.enabled.title'),
        description: t('twoFactor.toast.enabled.description'),
      });
    } catch {
      toast({
        variant: "destructive",
        title: t('twoFactor.toast.wrongCode.title'),
        description: t('twoFactor.toast.wrongCode.description'),
      });
    }
  };

  const qrCode = qrCodeData?.generate2FASecret;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t('twoFactor.title')}
        description={t('twoFactor.description')}
        className="mb-0"
        actions={
          <Button asChild variant="outline">
            <Link href="/profile">{t('twoFactor.backToProfile')}</Link>
          </Button>
        }
      />

      {!statusKnown ? (
        statusQuery.loading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <ErrorState
            description={t('twoFactor.statusError')}
            onRetry={() => statusQuery.refetch()}
          />
        )
      ) : isActivated ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">{t('twoFactor.active.title')}</CardTitle>
              <Badge variant="success">{t('twoFactor.active.badge')}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground" role="status">
              {t('twoFactor.active.description')}
            </p>
          </CardContent>
          <CardFooter className="justify-end">
            <Button variant="outline" className="text-destructive" onClick={() => setShowDisable(true)}>
              {t('twoFactor.active.disable')}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg">{t('twoFactor.scan.title')}</CardTitle>
                <Badge variant={qrCode ? 'warning' : 'neutral'}>
                  {qrCode ? t('twoFactor.scan.waitingForCode') : t('twoFactor.scan.toGenerate')}
                </Badge>
              </div>
              <CardDescription>
                {t('twoFactor.scan.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {qrCode && (
                // eslint-disable-next-line @next/next/no-img-element -- data URL returned by the API
                <img
                  src={qrCode}
                  alt={t('twoFactor.scan.qrAlt')}
                  className="h-48 w-48 rounded-md border"
                />
              )}
              <Button onClick={handleGenerate2FA} disabled={generating} variant={qrCode ? 'outline' : 'default'}>
                {generating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {qrCode ? t('twoFactor.scan.regenerate') : t('twoFactor.scan.generate')}
              </Button>
            </CardContent>
          </Card>

          {qrCode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('twoFactor.confirm.title')}</CardTitle>
                <CardDescription>{t('twoFactor.confirm.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleConfirm2FA} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="two-factor-code">{t('twoFactor.confirm.code')}</Label>
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
                    {t('twoFactor.confirm.submit')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <DisableTwoFactorDialog
        open={showDisable}
        onOpenChange={setShowDisable}
        onDisabled={() => {
          // A new setup starts from scratch: the previous QR code is no longer valid.
          resetQrCode();
          setCode('');
        }}
      />
    </div>
  );
}
