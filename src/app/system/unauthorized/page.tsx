'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/app/auth/_components/AuthCard';

export default function UnauthorizedPage() {
  const { t } = useTranslation('auth');
  return (
    <AuthCard
      icon={ShieldAlert}
      tone="warning"
      title={t('system.unauthorized.title')}
      description={t('system.unauthorized.description')}
      footer={t('system.unauthorized.footer')}
    >
      <Button asChild className="w-full">
        <Link href="/dashboard">{t('common.backToDashboard')}</Link>
      </Button>
    </AuthCard>
  );
}
