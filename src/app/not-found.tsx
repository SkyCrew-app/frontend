'use client';

import Link from 'next/link';
import { Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/app/auth/_components/AuthCard';

export default function NotFound() {
  const { t } = useTranslation('auth');
  return (
    <AuthCard
      icon={Compass}
      title={t('error.notFound.title')}
      description={t('error.notFound.description')}
    >
      <Button asChild className="w-full">
        <Link href="/dashboard">{t('common.backToDashboard')}</Link>
      </Button>
    </AuthCard>
  );
}
