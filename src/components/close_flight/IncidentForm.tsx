"use client"

import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle } from 'lucide-react'
import { useEffect } from "react"

export default function IncidentForm() {
  const { control, watch, setValue, getValues } = useFormContext()
  const incidentOccurred = watch("incidentOccurred")

  useEffect(() => {
    if (incidentOccurred) {
      setValue("incident_status", "Ouvert")
      if (!getValues("incident_date")) {
        setValue("incident_date", new Date())
      }
    }
  }, [incidentOccurred, setValue, getValues])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Incident</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={control}
          name="incidentOccurred"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Incident survenu pendant le vol</FormLabel>
                <FormDescription>Signalez tout incident ou anomalie observé pendant le vol</FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked)
                    if (checked) {
                      setValue("incident_status", "Ouvert")
                      if (!getValues("incident_date")) {
                        setValue("incident_date", new Date())
                      }
                    } else {
                      setValue("incident_description", "")
                      setValue("damage_report", "")
                      setValue("corrective_actions", "")
                      setValue("incident_date", null)
                      setValue("severity_level", undefined)
                      setValue("incident_priority", undefined)
                      setValue("incident_category", undefined)
                    }
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {incidentOccurred && (
          <div className="space-y-4">
            <FormField
              control={control}
              name="incident_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de l'incident</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="severity_level"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Gravité de l'incident</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="low" />
                        </FormControl>
                        <FormLabel className="font-normal">Faible</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="medium" />
                        </FormControl>
                        <FormLabel className="font-normal">Moyenne</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="high" />
                        </FormControl>
                        <FormLabel className="font-normal">Élevée</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="incident_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description de l'incident</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez l'incident en détail..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="damage_report"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rapport de dommages</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez les dommages éventuels..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="corrective_actions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actions correctives</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez les actions correctives prises ou à prendre..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="incident_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut de l'incident</FormLabel>
                  <FormControl>
                    <Input {...field} value="Ouvert" disabled />
                  </FormControl>
                  <FormDescription>Le statut de l'incident est automatiquement défini sur "Ouvert"</FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="incident_priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorité de l'incident</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une priorité" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Basse</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="high">Haute</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="incident_category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie de l'incident</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mechanical">Mécanique</SelectItem>
                      <SelectItem value="electrical">Électrique</SelectItem>
                      <SelectItem value="weather">Météorologique</SelectItem>
                      <SelectItem value="human_error">Erreur humaine</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
