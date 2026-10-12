"use client"

import React, { useState, useEffect, useRef } from "react"
import { useMutation } from "@apollo/client"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Camera, Loader2 } from "lucide-react"
import axios from "axios"
import { UPDATE_USER } from "@/graphql/user"
import { useToast } from "@/components/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getBackendBaseUrl } from "@/lib/runtime-config"
import { getAge } from "@/lib/age"
import { FormField } from "./form-field"

const toFormData = (userData: any) => ({
  first_name: userData?.first_name || "",
  last_name: userData?.last_name || "",
  email: userData?.email || "",
  phone_number: userData?.phone_number || "",
  address: userData?.address || "",
  date_of_birth: userData?.date_of_birth || "",
  profile_picture: userData?.profile_picture || "",
})

const NO_ERRORS = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  address: "",
  date_of_birth: "",
}

// Value of the date input: the API sends a full timestamp.
const toDateInputValue = (value: string) => {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0]
}

interface ProfileFormProps {
  userData: any
  userId: string | null
  refetch: () => Promise<any>
}

export function ProfileForm({ userData, userId, refetch }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    address: "",
    date_of_birth: "",
    profile_picture: "",
  })

  const [errors, setErrors] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    address: "",
    date_of_birth: "",
  })

  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Only the answer to the latest address search is shown.
  const addressRequest = useRef(0)

  const { toast } = useToast()
  const [updateProfile] = useMutation(UPDATE_USER)

  useEffect(() => {
    if (userData) {
      setFormData(toFormData(userData))
    }
  }, [userData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: "" }))

    if (name === "address" && value.length > 2) {
      fetchAddressSuggestions(value)
    } else if (name === "address") {
      addressRequest.current += 1
      setAddressSuggestions([])
    }

  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setPreviewImage(URL.createObjectURL(file))
    }
  }

  const fetchAddressSuggestions = async (query: string) => {
    const request = ++addressRequest.current
    try {
      const response = await axios.get(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`,
      )
      if (request !== addressRequest.current) return
      const suggestions = response.data.features.map((feature: any) => feature.properties.label)
      setAddressSuggestions(suggestions)
    } catch (error) {
      if (request !== addressRequest.current) return
      console.error("Erreur lors de la récupération des suggestions d'adresse:", error)
      setAddressSuggestions([])
    }
  }

  const selectAddress = (address: string) => {
    addressRequest.current += 1
    setFormData((prev) => ({ ...prev, address }))
    setErrors((prev) => ({ ...prev, address: "" }))
    setAddressSuggestions([])
  }

  const validateForm = () => {
    let valid = true
    const newErrors = {
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      address: "",
      date_of_birth: "",
    }

    if (!formData.first_name) {
      valid = false
      newErrors.first_name = "Le prénom est requis."
    } else if (formData.first_name.length < 2) {
      valid = false
      newErrors.first_name = "Le prénom doit contenir au moins 2 caractères."
    }

    if (!formData.last_name) {
      valid = false
      newErrors.last_name = "Le nom est requis."
    } else if (formData.last_name.length < 2) {
      valid = false
      newErrors.last_name = "Le nom doit contenir au moins 2 caractères."
    }

    if (!formData.email) {
      newErrors.email = "L'email est requis"
      valid = false
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      newErrors.email = "L'email n'est pas valide"
      valid = false
    }

    if (!formData.phone_number) {
      newErrors.phone_number = "Le numéro de téléphone est requis."
      valid = false
    } else if (!/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/.test(formData.phone_number)) {
      valid = false
      newErrors.phone_number =
        "Le numéro de téléphone n'est pas valide. Format attendu: 0X XX XX XX XX ou +33 X XX XX XX XX"
    }

    if (!formData.address) {
      valid = false
      newErrors.address = "L'adresse est requise."
    } else if (formData.address.length < 5) {
      valid = false
      newErrors.address = "L'adresse doit être complète."
    }

    if (!formData.date_of_birth) {
      valid = false
      newErrors.date_of_birth = "La date de naissance est requise."
    } else {
      const age = getAge(new Date(formData.date_of_birth))

      if (age < 16) {
        valid = false
        newErrors.date_of_birth = "Vous devez avoir au moins 16 ans."
      } else if (age > 100) {
        valid = false
        newErrors.date_of_birth = "Veuillez vérifier la date de naissance."
      }
    }

    setErrors(newErrors)
    return valid
  }

  const saveProfileChanges = async () => {
    // The identifier is only known once the member is loaded.
    if (!userId) return

    if (!validateForm()) {
      // Once the messages are rendered, bring the first field to fix into view.
      setTimeout(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      }, 0)
      return
    }

    setIsUpdating(true)
    try {
      const { data } = await updateProfile({
        variables: {
          updateUserInput: {
            id: Number(userId),
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone_number: formData.phone_number,
            address: formData.address,
            date_of_birth: formData.date_of_birth ? new Date(formData.date_of_birth) : null,
          },
          image: selectedImage,
        },
      })

      if (data?.updateUser) {
        toast({
          title: "Succès",
          description: "Profil mis à jour avec succès",
        })

        if (selectedImage) {
          setSelectedImage(null)
        }

        await refetch()
      } else {
        throw new Error("La mise à jour a échoué")
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de la mise à jour du profil",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const saved = toFormData(userData)
  const isDirty =
    Boolean(selectedImage) ||
    (Object.keys(saved) as Array<keyof typeof saved>).some((key) => formData[key] !== saved[key])

  const resetForm = () => {
    addressRequest.current += 1
    setFormData(saved)
    setErrors(NO_ERRORS)
    setAddressSuggestions([])
    setSelectedImage(null)
    setPreviewImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const fieldProps = (name: keyof typeof NO_ERRORS) => ({
    id: name,
    name,
    value: formData[name],
    onChange: handleChange,
    "aria-required": true,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    className: cn(errors[name] && "border-destructive"),
  })

  return (
    <Card>
      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void saveProfileChanges()
        }}
      >
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
          <CardDescription>Ces coordonnées servent au club pour vous identifier et vous contacter.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20 shrink-0">
              {previewImage ? (
                <AvatarImage src={previewImage} alt="Aperçu de la photo de profil" />
              ) : formData.profile_picture ? (
                <AvatarImage src={`${getBackendBaseUrl()}${formData.profile_picture}`} alt="Photo de profil" />
              ) : (
                <AvatarFallback className="bg-primary/10 text-xl text-primary">
                  {formData.first_name?.[0]}
                  {formData.last_name?.[0]}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="space-y-1.5">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Camera className="h-4 w-4" aria-hidden="true" />
                Changer la photo
              </Button>
              <input
                ref={fileInputRef}
                id="picture"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                aria-label="Photo de profil"
                tabIndex={-1}
              />
              <p className="text-xs text-muted-foreground">
                {selectedImage
                  ? "La nouvelle photo sera enregistrée avec le formulaire."
                  : "Une image carrée au format JPG ou PNG."}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="first_name" label="Prénom" required error={errors.first_name}>
              <Input {...fieldProps("first_name")} placeholder="Camille" autoComplete="given-name" />
            </FormField>

            <FormField id="last_name" label="Nom" required error={errors.last_name}>
              <Input {...fieldProps("last_name")} placeholder="Martin" autoComplete="family-name" />
            </FormField>

            <FormField id="email" label="Email" required error={errors.email}>
              <Input
                {...fieldProps("email")}
                type="email"
                placeholder="camille.martin@exemple.fr"
                autoComplete="email"
              />
            </FormField>

            <FormField id="phone_number" label="Numéro de téléphone" required error={errors.phone_number}>
              <Input {...fieldProps("phone_number")} type="tel" placeholder="06 12 34 56 78" autoComplete="tel" />
            </FormField>

            <FormField id="address" label="Adresse" required error={errors.address} className="sm:col-span-2">
              <div className="relative">
                <Input
                  {...fieldProps("address")}
                  placeholder="12 rue de l'Aérodrome, 31000 Toulouse"
                  autoComplete="off"
                />
                {addressSuggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-auto rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md">
                    {addressSuggestions.map((suggestion, index) => (
                      <li key={index}>
                        <button
                          type="button"
                          className="w-full rounded-sm px-2 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                          onClick={() => selectAddress(suggestion)}
                        >
                          {suggestion}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </FormField>

            <FormField id="date_of_birth" label="Date de naissance" required error={errors.date_of_birth}>
              <Input
                {...fieldProps("date_of_birth")}
                type="date"
                value={toDateInputValue(formData.date_of_birth)}
                max={new Date().toISOString().split("T")[0]}
                autoComplete="bday"
              />
            </FormField>
          </div>
        </CardContent>
        <CardFooter className="flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={resetForm} disabled={isUpdating || !isDirty}>
            Annuler
          </Button>
          <Button type="submit" disabled={isUpdating || !userId}>
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isUpdating ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
