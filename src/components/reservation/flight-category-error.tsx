import { useTranslation } from "react-i18next"

export function FlightCategoryError({ visible }: Readonly<{ visible: boolean }>) {
  const { t } = useTranslation("reservations")
  if (!visible) return null

  return (
    <p className="mt-1 text-sm text-destructive" role="alert">
      {t("form.errors.category")}
    </p>
  )
}
