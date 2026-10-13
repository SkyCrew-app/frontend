'use client';

import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/app/auth/_components/AuthCard';

export default function NotConnectedPage() {
  const { t } = useTranslation('auth');
  return (
    <AuthCard
      icon={LogIn}
      title={t('system.notConnected.title')}
      description={t('system.notConnected.description')}
      footer={t('system.notConnected.footer')}
    >
      <Button asChild className="w-full">
        <Link href="/">{t('common.signIn')}</Link>
      </Button>
    </AuthCard>
  );
}
