'use client';

import { CirclePause, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/app/auth/_components/AuthCard';

// The proxy sends every page here while the installation is suspended, and
// sends this page back home once it is restored: a reload is enough to retry.
export default function SuspendedPage() {
  const { t } = useTranslation('auth');
  return (
    <AuthCard
      icon={CirclePause}
      tone="warning"
      title={t('system.suspended.title')}
      description={t('system.suspended.description')}
      footer={t('system.suspended.footer')}
    >
      <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
        <RefreshCw className="h-4 w-4" />
        {t('common:actions.retry')}
      </Button>
    </AuthCard>
  );
}
