import { useFormContext } from "react-hook-form"
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

export default function FlightNotesForm() {
  const { control } = useFormContext()

  return (
    <FormField
      control={control}
      name="flightNotes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Remarques sur le vol</FormLabel>
          <FormControl>
            <Textarea
              placeholder="Ex. : trois tours de piste à Pontoise, exercice de panne en campagne"
              className="resize-none"
              rows={6}
              maxLength={2000}
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormDescription>Elles sont reprises dans la colonne « Remarques » de votre carnet de vol.</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
