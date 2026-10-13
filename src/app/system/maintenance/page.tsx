'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { useQuery } from '@apollo/client'
import { MAINTENANCE_QUERY } from '@/graphql/system'
import { formatDateTime } from '@/lib/format'
import { withBasePath } from '@/lib/runtime-config'
import { AuthCard, AuthCardSkeleton } from '@/app/auth/_components/AuthCard'

interface MaintenanceDetails {
  maintenanceTime: string
  maintenanceMessage: string
}

const pad = (value: number) => String(value).padStart(2, '0')

const CountdownTimer = ({ endTime }: { endTime: Date }) => {
  const { t } = useTranslation('auth')
  const [remaining, setRemaining] = useState(() => endTime.getTime() - Date.now())

  useEffect(() => {
    const update = () => setRemaining(endTime.getTime() - Date.now())
    update()
    const timer = setInterval(update, 1000)

    return () => clearInterval(timer)
  }, [endTime])

  if (remaining <= 0) {
    return <p className="text-sm text-muted-foreground">{t('system.maintenance.finished')}</p>
  }

  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

  return (
    <div className="rounded-lg bg-muted/50 p-4 text-center">
      <p className="text-xs text-muted-foreground">{t('system.maintenance.remaining')}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums" role="timer">
        {t('system.maintenance.countdown', { hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) })}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{t('system.maintenance.backAt', { date: formatDateTime(endTime) })}</p>
    </div>
  )
}

const parseDetails = (raw: string | undefined): MaintenanceDetails | null => {
  if (!raw) return null
  try {
    return JSON.parse(raw) as MaintenanceDetails
  } catch (e) {
    console.error("Error parsing maintenance details:", e)
    return null
  }
}

export default function MaintenancePage() {
  const { t } = useTranslation('auth')
  const { data, loading } = useQuery<{ getMaintenanceDetails: string }>(MAINTENANCE_QUERY)

  if (loading) return <AuthCardSkeleton />

  // Without details from the server the page still says what is going on.
  const details = parseDetails(data?.getMaintenanceDetails)
  const endTime = details?.maintenanceTime ? new Date(details.maintenanceTime) : null
  const hasEndTime = endTime !== null && !Number.isNaN(endTime.getTime())

  return (
    <AuthCard
      icon={Wrench}
      tone="warning"
      title={t('system.maintenance.title')}
      description={details?.maintenanceMessage || t('system.maintenance.defaultMessage')}
    >
      <div className="space-y-4">
        {hasEndTime && <CountdownTimer endTime={endTime} />}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            window.location.href = withBasePath('/')
          }}
        >
          <RefreshCw className="h-4 w-4" />
          {t('common:actions.retry')}
        </Button>
      </div>
    </AuthCard>
  )
}
