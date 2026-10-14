"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/layout/EmptyState"
import { PageHeader } from "@/components/layout/PageHeader"

/** Shown instead of a page the plan of the club does not include, e.g. opened from an old link. */
export function NotInPlan() {
  const { t } = useTranslation("common")
  return (
    <div className="space-y-6">
      <PageHeader title={t("plan.notIncluded.title")} className="mb-0" />
      <EmptyState
        icon={Lock}
        title={t("plan.notIncluded.feature")}
        description={t("plan.notIncluded.description")}
        action={
          <Button asChild>
            <Link href="/dashboard">{t("plan.notIncluded.back")}</Link>
          </Button>
        }
      />
    </div>
  )
}
