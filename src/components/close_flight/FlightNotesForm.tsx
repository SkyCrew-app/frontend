import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

export default function FlightNotesForm() {
  const { control } = useFormContext()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Remarques</CardTitle>
        <CardDescription>Elles sont reprises dans la colonne « Remarques » de votre carnet de vol.</CardDescription>
      </CardHeader>
      <CardContent>
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
                  rows={4}
                  maxLength={2000}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
