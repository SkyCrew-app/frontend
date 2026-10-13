import { useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

export default function FlightNotesForm() {
  const { control } = useFormContext()
  const { t } = useTranslation("flights")

  return (
    <FormField
      control={control}
      name="flightNotes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("closeFlight.notes.label")}</FormLabel>
          <FormControl>
            <Textarea
              placeholder={t("closeFlight.notes.placeholder")}
              className="resize-none"
              rows={6}
              maxLength={2000}
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormDescription>{t("closeFlight.notes.hint")}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
