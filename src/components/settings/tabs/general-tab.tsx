"use client"

import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { motion } from "framer-motion"
import { Building, Mail, Phone, MapPin, AlertTriangle } from "lucide-react"

export function GeneralTab() {
  const { register, formState, setValue, watch } = useFormContext()

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="border-t-4 border-t-blue-500 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Paramètres généraux</CardTitle>
          <CardDescription>Configurez les informations générales de l'aéroclub.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="club-name" className="flex items-center gap-2">
                <Building className="h-4 w-4 text-blue-500" />
                Nom de l'aéroclub
              </Label>
              <Input id="club-name" {...register("clubName")} />
              {formState.errors.clubName && (
                <p className="text-sm text-red-500">{formState.errors.clubName.message as string}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                Email de contact
              </Label>
              <Input id="contact-email" type="email" {...register("contactEmail")} />
              {formState.errors.contactEmail && (
                <p className="text-sm text-red-500">{formState.errors.contactEmail.message as string}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-500" />
                Numéro de contact
              </Label>
              <Input id="contact-phone" type="tel" {...register("contactPhone")} />
              {formState.errors.contactPhone && (
                <p className="text-sm text-red-500">{formState.errors.contactPhone.message as string}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                Adresse
              </Label>
              <Textarea id="address" {...register("address")} />
              {formState.errors.address && (
                <p className="text-sm text-red-500">{formState.errors.address.message as string}</p>
              )}
            </div>
          </div>
          <Separator className="my-4" />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Maintenance du site
            </h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-maintenance-active"
                checked={watch("isMaintenanceActive")}
                onCheckedChange={(checked) => setValue("isMaintenanceActive", !!checked)}
              />
              <Label htmlFor="is-maintenance-active">Activer le mode maintenance</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance-message">Message de maintenance</Label>
              <Textarea
                id="maintenance-message"
                {...register("maintenanceMessage")}
                placeholder="Message à afficher pendant la maintenance..."
                className="h-24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance-time">Date et heure de fin de maintenance</Label>
              <Input id="maintenance-time" type="datetime-local" {...register("maintenanceTime")} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
