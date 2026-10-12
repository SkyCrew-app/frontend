"use client"

import React, { useState, useEffect } from "react"
import { useMutation } from "@apollo/client"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UPDATE_USER_PREFERENCES } from "@/graphql/user"
import { useToast } from "@/components/hooks/use-toast"
import { AerodromeCombobox } from "@/components/ui/comboboAerodrome"
import { TimezoneCombobox } from "@/components/ui/timezoneCombobox"
import Flag from "react-world-flags"
import { Loader2 } from "lucide-react"

const LANGUAGES = [
  { value: "fr", label: "Français", flag: "FR" },
  { value: "en", label: "English", flag: "GB" },
  { value: "es", label: "Español", flag: "ES" },
]

const SPEED_UNITS = [
  { value: "kmh", label: "km/h" },
  { value: "mph", label: "mph" },
  { value: "knots", label: "Nœuds" },
]

const DISTANCE_UNITS = [
  { value: "km", label: "Kilomètres" },
  { value: "miles", label: "Miles" },
  { value: "nautical_miles", label: "Milles nautiques" },
]

interface ChoiceGroupProps {
  id: string
  label: string
  value: string
  options: Array<{ value: string; label: string; flag?: string }>
  onChange: (value: string) => void
}

// A small set of exclusive choices, all visible at once.
function ChoiceGroup({ id, label, value, options, onChange }: ChoiceGroupProps) {
  return (
    <div className="space-y-1.5">
      <p id={id} className="text-sm font-medium leading-none">
        {label}
      </p>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={value === option.value ? "default" : "outline"}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.flag && <Flag code={option.flag} className="h-3 w-5 rounded-sm object-cover" alt="" />}
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

const toPreferences = (userData: any) => ({
  language: userData?.language || "fr",
  speed_unit: userData?.speed_unit || "kmh",
  distance_unit: userData?.distance_unit || "km",
  timezone: userData?.timezone || "Europe/Paris",
  preferred_aerodrome: userData?.preferred_aerodrome || "",
})

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
  // Bumped on cancel: the aerodrome picker keeps the name it last showed otherwise.
  const [resetCount, setResetCount] = useState(0)

  const { toast } = useToast()
  const [updatePreferences] = useMutation(UPDATE_USER_PREFERENCES)

  useEffect(() => {
    if (userData) {
      setPreferences(toPreferences(userData))
    }
  }, [userData])

  const handlePreferenceChange = (name: string, value: string) => {
    setPreferences(prev => ({ ...prev, [name]: value }))
  }

  const savePreferencesChanges = async () => {
    // L'identifiant n'est connu qu'une fois l'utilisateur chargé.
    if (!userId) return

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

  const saved = toPreferences(userData)
  const isDirty =
    Boolean(userData) &&
    (Object.keys(saved) as Array<keyof typeof saved>).some((key) => preferences[key] !== saved[key])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Préférences</CardTitle>
        <CardDescription>Votre terrain habituel, votre fuseau horaire et les unités affichées.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p id="preferred_aerodrome_label" className="text-sm font-medium leading-none">
              Aérodrome préféré
            </p>
            <div role="group" aria-labelledby="preferred_aerodrome_label">
              <AerodromeCombobox
                key={resetCount}
                onAerodromeChange={(value) => handlePreferenceChange("preferred_aerodrome", value)}
                defaultValue={preferences.preferred_aerodrome}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <p id="timezone_label" className="text-sm font-medium leading-none">
              Fuseau horaire
            </p>
            <div role="group" aria-labelledby="timezone_label">
              <TimezoneCombobox
                onTimezoneChange={(value) => handlePreferenceChange("timezone", value)}
                selectedTimezone={preferences.timezone}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ChoiceGroup
            id="language_label"
            label="Langue"
            value={preferences.language}
            options={LANGUAGES}
            onChange={(value) => handlePreferenceChange("language", value)}
          />
          <ChoiceGroup
            id="speed_unit_label"
            label="Unité de vitesse"
            value={preferences.speed_unit}
            options={SPEED_UNITS}
            onChange={(value) => handlePreferenceChange("speed_unit", value)}
          />
          <ChoiceGroup
            id="distance_unit_label"
            label="Unité de distance"
            value={preferences.distance_unit}
            options={DISTANCE_UNITS}
            onChange={(value) => handlePreferenceChange("distance_unit", value)}
          />
        </div>
      </CardContent>
      <CardFooter className="flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setPreferences(saved)
            setResetCount((count) => count + 1)
          }}
          disabled={isUpdating || !isDirty}
        >
          Annuler
        </Button>
        <Button type="button" onClick={savePreferencesChanges} disabled={isUpdating || !userId}>
          {isUpdating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {isUpdating ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </CardFooter>
    </Card>
  )
}
