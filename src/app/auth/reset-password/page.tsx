'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { CheckCircle2, Link2Off, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RESET_PASSWORD } from '@/graphql/user';
import { PASSWORD_MIN_LENGTH, newPasswordError } from '@/lib/password';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/hooks/use-toast";
import { AuthCard, AuthCardSkeleton, AuthLink, FieldError } from '@/app/auth/_components/AuthCard';

function ResetPasswordComponent() {
  const { t } = useTranslation('auth');
  const token = useSearchParams().get('token');
  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = newPasswordError(password, confirmPassword);
    setFormError(problem);
    if (problem || !token) return;

    try {
      await resetPassword({ variables: { token, newPassword: password } });
      setSuccess(true);
    } catch {
      toast({
        variant: "destructive",
        title: t('resetPassword.toast.failed.title'),
        description: t('resetPassword.toast.failed.description'),
      });
    }
  };

  if (success) {
    return (
      <AuthCard
        icon={CheckCircle2}
        tone="success"
        title={t('resetPassword.done.title')}
        description={t('resetPassword.done.description')}
      >
        <Button asChild className="w-full">
          <Link href="/">{t('common.signIn')}</Link>
        </Button>
      </AuthCard>
    );
  }

  if (!token) {
    return (
      <AuthCard
        icon={Link2Off}
        tone="warning"
        title={t('common.incompleteLink')}
        description={t('resetPassword.incomplete.description')}
        footer={<AuthLink href="/">{t('common.backToSignIn')}</AuthLink>}
      >
        <Button asChild className="w-full">
          <Link href="/auth/forgot-password">{t('resetPassword.incomplete.action')}</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t('resetPassword.title')}
      description={t('resetPassword.description')}
      footer={<AuthLink href="/">{t('common.backToSignIn')}</AuthLink>}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t('resetPassword.newPassword')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!formError}
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            {t('common.passwordHint', { count: PASSWORD_MIN_LENGTH })}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">{t('common.confirmPassword')}</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={!!formError}
            aria-describedby={formError ? "password-error" : undefined}
          />
          <FieldError id="password-error">{formError}</FieldError>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('resetPassword.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <ResetPasswordComponent />
    </Suspense>
  );
}
