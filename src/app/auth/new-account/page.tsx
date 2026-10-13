'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { CheckCircle2, Link2Off, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/hooks/use-toast";
import { CONFIRM_EMAIL_AND_SET_PASSWORD } from '@/graphql/user';
import { PASSWORD_MIN_LENGTH, newPasswordError } from '@/lib/password';
import { AuthCard, AuthCardSkeleton, AuthLink, FieldError } from '@/app/auth/_components/AuthCard';

function ConfirmEmailComponent() {
  const { t } = useTranslation('auth');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [confirmEmailAndSetPassword, { loading }] = useMutation(CONFIRM_EMAIL_AND_SET_PASSWORD);

  const validation_token = searchParams.get('token');

  // Once the account is active, the sign-in page opens by itself.
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => router.push('/'), 3000);
    return () => clearTimeout(timer);
  }, [success, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const problem = newPasswordError(password, confirmPassword);
    setFormError(problem);
    if (problem || !validation_token) return;

    try {
      await confirmEmailAndSetPassword({
        variables: {
          validation_token,
          password,
        },
      });
      setSuccess(true);
    } catch {
      toast({
        variant: "destructive",
        title: t('newAccount.toast.failed.title'),
        description: t('newAccount.toast.failed.description'),
      });
    }
  };

  if (success) {
    return (
      <AuthCard
        icon={CheckCircle2}
        tone="success"
        title={t('newAccount.done.title')}
        description={t('newAccount.done.description')}
      >
        <Button asChild className="w-full">
          <Link href="/">{t('common.signIn')}</Link>
        </Button>
      </AuthCard>
    );
  }

  if (!validation_token) {
    return (
      <AuthCard
        icon={Link2Off}
        tone="warning"
        title={t('common.incompleteLink')}
        description={t('newAccount.incomplete.description')}
        footer={<AuthLink href="/">{t('common.backToSignIn')}</AuthLink>}
      />
    );
  }

  return (
    <AuthCard
      title={t('newAccount.title')}
      description={t('newAccount.description')}
      footer={<AuthLink href="/">{t('common.backToSignIn')}</AuthLink>}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t('common.password')}</Label>
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
          {t('newAccount.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <ConfirmEmailComponent />
    </Suspense>
  );
}
