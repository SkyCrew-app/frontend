import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { FileText } from "lucide-react"

export default function FlightNotesForm() {
  const { control } = useFormContext()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Notes de vol</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <FormField
          control={control}
          name="flightNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes additionnelles</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ajoutez des notes ou commentaires sur le vol..."
                  className="resize-none"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormDescription>Ces notes seront visibles par les autres membres et instructeurs</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}

