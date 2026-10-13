'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, MailCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/hooks/use-toast";
import { useMutation } from '@apollo/client';
import { REQUEST_PASSWORD_RESET } from '@/graphql/user';
import { forgotPasswordSchema } from '@/lib/validations';
import { AuthCard, AuthLink, FieldError } from '@/app/auth/_components/AuthCard';
import { authIssueMessage } from '@/app/auth/_components/validation-message';

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const [requestPasswordReset, { loading }] = useMutation(REQUEST_PASSWORD_RESET);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!result.success) {
      setEmailError(authIssueMessage(result.error.issues[0]));
      return;
    }
    setEmailError(null);

    try {
      // The API answers the same whether or not the address has an account.
      await requestPasswordReset({ variables: { email: email.trim() } });
      setSuccess(true);
    } catch {
      toast({
        variant: "destructive",
        title: t('forgotPassword.toast.failed.title'),
        description: t('forgotPassword.toast.failed.description'),
      });
    }
  };

  if (success) {
    return (
      <AuthCard
        icon={MailCheck}
        tone="success"
        title={t('forgotPassword.sent.title')}
        description={t('forgotPassword.sent.description', { email: email.trim() })}
      >
        <Button asChild className="w-full">
          <Link href="/">{t('common.backToSignIn')}</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t('forgotPassword.title')}
      description={t('forgotPassword.description')}
      footer={<AuthLink href="/">{t('common.backToSignIn')}</AuthLink>}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('common:labels.email')}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t('common.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "email-error" : undefined}
          />
          <FieldError id="email-error">{emailError}</FieldError>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('forgotPassword.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
