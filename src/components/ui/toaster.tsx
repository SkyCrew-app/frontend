"use client"

import { useTranslation } from "react-i18next"
import { useToast } from "@/components/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()
  const { t } = useTranslation()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            {/* An icon-only button: it needs a name for screen readers. */}
            <ToastClose aria-label={t("common:actions.close")} />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
