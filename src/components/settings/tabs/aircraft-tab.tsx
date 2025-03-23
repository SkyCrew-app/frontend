"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { useFormContext } from "react-hook-form"
import { motion } from "framer-motion"
import { Plane, Fuel, DollarSign } from "lucide-react"

export function AircraftTab() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext()
  const aircraftTypes = watch("aircraftTypes") || []
  const fuelManagement = watch("fuelManagement")

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="border-t-4 border-t-blue-500 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Gestion des avions</CardTitle>
          <CardDescription>Configurez les types d'avions et les tarifs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Plane className="h-5 w-5 text-blue-500" />
              Types d'avions et tarifs horaires
            </h3>
            {aircraftTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun avion disponible. Veuillez en ajouter dans la section gestion de flotte.
              </p>
            ) : (
              aircraftTypes.map((aircraft: any, index: any) => (
                <div
                  key={aircraft.type}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 border rounded-md hover:bg-muted/10"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`aircraft-${aircraft.type}`}
                      checked={aircraft.isAvailable}
                      onCheckedChange={(checked) => {
                        const updatedAircraftTypes = [...aircraftTypes]
                        updatedAircraftTypes[index] = { ...aircraft, isAvailable: !!checked }
                        setValue("aircraftTypes", updatedAircraftTypes)
                      }}
                    />
                    <Label
                      htmlFor={`aircraft-${aircraft.type}`}
                      className={`flex-grow ${aircraft.isAvailable ? "" : "text-gray-400"}`}
                    >
                      {aircraft.type}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <Input
                      type="number"
                      {...register(`aircraftTypes.${index}.hourlyRate`, { valueAsNumber: true })}
                      className={`w-24 ${aircraft.isAvailable ? "" : "bg-gray-100 text-gray-400"}`}
                      placeholder="Tarif/h"
                      disabled={!aircraft.isAvailable}
                    />
                    <span className={aircraft.isAvailable ? "font-medium" : "text-gray-400"}>€/h</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Fuel className="h-5 w-5 text-blue-500" />
              Gestion du carburant
            </h3>
            <RadioGroup
              value={fuelManagement}
              onValueChange={(value) => setValue("fuelManagement", value as "self-service" | "staff-only" | "external")}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="self-service" id="fuel-self-service" />
                <Label htmlFor="fuel-self-service">Libre-service</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="staff-only" id="fuel-staff-only" />
                <Label htmlFor="fuel-staff-only">Personnel uniquement</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="external" id="fuel-external" />
                <Label htmlFor="fuel-external">Fournisseur externe</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuel-price" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Prix du carburant (€/L)
            </Label>
            <Input
              id="fuel-price"
              type="number"
              {...register("fuelPrice", { valueAsNumber: true })}
              min="0"
              step="0.01"
            />
            {errors.fuelPrice && <p className="text-sm text-red-500">{errors.fuelPrice.message as string}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
