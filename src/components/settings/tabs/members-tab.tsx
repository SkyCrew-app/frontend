"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useFormContext, Controller } from "react-hook-form"
import { motion } from "framer-motion"
import { BadgeCheck, DollarSign, FileText } from "lucide-react"

export function MembersTab() {
  const {
    register,
    control,
    watch,
    formState: { errors },
    setValue,
    getValues,
  } = useFormContext()
  const allowGuestPilots = watch("allowGuestPilots")

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="border-t-4 border-t-blue-500 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Gestion des membres</CardTitle>
          <CardDescription>Configurez les paramètres liés aux membres de l'aéroclub.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-blue-500" />
              Licences de pilote acceptées
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {["PPL", "LAPL", "CPL", "ATPL"].map((license) => (
                <div key={license} className="flex items-center space-x-2">
                  <Controller
                    name="pilotLicenses"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id={`license-${license}`}
                        value={license}
                        checked={field.value?.includes(license) || false}
                        onCheckedChange={(checked) => {
                          const updatedLicenses = checked
                            ? [...(field.value || []), license]
                            : (field.value || []).filter((item: string) => item !== license)
                          field.onChange(updatedLicenses)
                        }}
                      />
                    )}
                  />
                  <Label htmlFor={`license-${license}`}>{license}</Label>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              Tarifs et cotisations
            </h3>
            <div className="space-y-2">
              <Label htmlFor="membership-fee">Cotisation annuelle (€)</Label>
              <Input
                id="membership-fee"
                type="number"
                {...register("membershipFee", { valueAsNumber: true })}
                min="0"
                step="0.01"
              />
              {errors.membershipFee && <p className="text-sm text-red-500">{errors.membershipFee.message as string}</p>}
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="allow-guest-pilots"
                checked={getValues("allowGuestPilots")}
                onCheckedChange={(checked) => {
                  setValue("allowGuestPilots", checked === true)
                }}
              />
              <Label htmlFor="allow-guest-pilots">Autoriser les pilotes invités</Label>
            </div>

            {allowGuestPilots && (
              <div className="space-y-2 pl-6 border-l-2 border-blue-200">
                <Label htmlFor="guest-pilot-fee">Frais pour pilotes invités (€)</Label>
                <Input
                  id="guest-pilot-fee"
                  type="number"
                  {...register("guestPilotFee", { valueAsNumber: true })}
                  min="0"
                  step="0.01"
                />
                {errors.guestPilotFee && (
                  <p className="text-sm text-red-500">{errors.guestPilotFee.message as string}</p>
                )}
              </div>
            )}
          </div>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Règlement intérieur
            </h3>
            <Textarea
              id="club-rules"
              {...register("clubRules")}
              placeholder="Entrez le règlement intérieur de l'aéroclub..."
              className="min-h-[150px]"
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
