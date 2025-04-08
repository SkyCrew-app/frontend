"use client"

import React, { useState, useEffect } from "react"
import { useMutation } from "@apollo/client"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { UPDATE_USER_PREFERENCES } from "@/graphql/user"
import { useToast } from "@/components/hooks/use-toast"
import { AerodromeCombobox } from "@/components/ui/comboboAerodrome"
import { TimezoneCombobox } from "@/components/ui/timezoneCombobox"
import Flag from "react-world-flags"
import { motion } from "framer-motion"

interface PreferencesFormProps {
  userData: any
  userId: string | null
  refetch: () => Promise<any>
}

export function PreferencesForm({ userData, userId, refetch }: PreferencesFormProps) {
  const [preferences, setPreferences] = useState({
    language: "",
    speed_unit: "",
    distance_unit: "",
    timezone: "",
    preferred_aerodrome: "",
  })

  const [isUpdating, setIsUpdating] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { toast } = useToast()
  const [updatePreferences] = useMutation(UPDATE_USER_PREFERENCES)

  useEffect(() => {
    if (userData) {
      setPreferences({
        language: userData.language || "fr",
        speed_unit: userData.speed_unit || "kmh",
        distance_unit: userData.distance_unit || "km",
        timezone: userData.timezone || "Europe/Paris",
        preferred_aerodrome: userData.preferred_aerodrome || "",
      })
    }
  }, [userData])

  const handlePreferenceChange = (name: string, value: string) => {
    setPreferences(prev => ({ ...prev, [name]: value }))
    setSaveSuccess(false)
  }

  const savePreferencesChanges = async () => {
    setIsUpdating(true)
    try {
      const { data } = await updatePreferences({
        variables: {
          userId: userId,
          preference: {
            language: preferences.language,
            speed_unit: preferences.speed_unit,
            distance_unit: preferences.distance_unit,
            timezone: preferences.timezone,
            preferred_aerodrome: preferences.preferred_aerodrome,
          },
        },
      });

      if (data?.updateUserPreferences) {
        toast({
          title: "Succès",
          description: "Préférences mises à jour avec succès",
        })
        setSaveSuccess(true)
        await refetch()
      } else {
        throw new Error("La mise à jour a échoué")
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour des préférences:", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de la mise à jour des préférences",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">Préférences utilisateur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border rounded-lg">
            <Label htmlFor="preferred_aerodrome" className="block mb-2 font-medium">
              Aérodrome préféré
            </Label>
            <AerodromeCombobox
              onAerodromeChange={(value) => handlePreferenceChange("preferred_aerodrome", value)}
              defaultValue={preferences.preferred_aerodrome}
            />
          </div>

          <div className="p-4 border rounded-lg">
            <Label htmlFor="timezone" className="block mb-2 font-medium">
              Fuseau horaire
            </Label>
            <TimezoneCombobox
              onTimezoneChange={(value) => handlePreferenceChange("timezone", value)}
              selectedTimezone={preferences.timezone}
            />
          </div>

          <div className="p-4 border rounded-lg">
            <Label htmlFor="language" className="block mb-2 font-medium">
              Langue
            </Label>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant={preferences.language === "fr" ? "default" : "outline"}
                onClick={() => handlePreferenceChange("language", "fr")}
                className="flex items-center"
              >
                <Flag code="FR" className="w-5 h-5 mr-2" />
                Français
              </Button>
              <Button
                type="button"
                variant={preferences.language === "en" ? "default" : "outline"}
                onClick={() => handlePreferenceChange("language", "en")}
                className="flex items-center"
              >
                <Flag code="GB" className="w-5 h-5 mr-2" />
                English
              </Button>
              <Button
                type="button"
                variant={preferences.language === "es" ? "default" : "outline"}
                onClick={() => handlePreferenceChange("language", "es")}
                className="flex items-center"
              >
                <Flag code="ES" className="w-5 h-5 mr-2" />
                Español
              </Button>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <Label htmlFor="speed_unit" className="block mb-2 font-medium">
              Unité de vitesse
            </Label>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant={preferences.speed_unit === "kmh" ? "default" : "outline"}
                onClick={() => handlePreferenceChange("speed_unit", "kmh")}
              >
                km/h
              </Button>
              <Button
                type="button"
                variant={preferences.speed_unit === "mph" ? "default" : "outline"}
                onClick={() => handlePreferenceChange("speed_unit", "mph")}
              >
                mph
              </Button>
              <Button
                type="button"
                variant={preferences.speed_unit === "knots" ? "default" : "outline"}
                onClick={() => handlePreferenceChange("speed_unit", "knots")}
              >
                Knots
              </Button>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <Label htmlFor="distance_unit" className="block mb-2 font-medium">
              Unité de distance
            </Label>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant={preferences.distance_unit === "km" ? "default" : "outline"}
                onClick={() => handlePreferenceChange("distance_unit", "km")}
              >
                Kilomètres
              </Button>
              <Button
                type="button"
                variant={preferences.distance_unit === "miles" ? "default" : "outline"}
                onClick={() => handlePreferenceChange("distance_unit", "miles")}
              >
                Miles
              </Button>
              <Button
                type="button"
                variant={preferences.distance_unit === "nautical_miles" ? "default" : "outline"}
                onClick={() => handlePreferenceChange("distance_unit", "nautical_miles")}
              >
                Nautical Miles
              </Button>
            </div>
          </div>

          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 text-green-700 p-3 rounded-md text-sm border border-green-200"
            >
              Vos préférences ont été enregistrées avec succès.
            </motion.div>
          )}
        </CardContent>
        <CardFooter className="border-t bg-muted/50 pt-4">
          <Button
            className="ml-auto hover:shadow-md transition-shadow"
            onClick={savePreferencesChanges}
            disabled={isUpdating}
          >
            {isUpdating ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
