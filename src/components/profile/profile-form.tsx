"use client"

import React, { useState, useEffect } from "react"
import { useMutation } from "@apollo/client"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { User, Mail, Phone, MapPin, Calendar, Camera } from 'lucide-react'
import axios from "axios"
import { UPDATE_USER } from "@/graphql/user"
import { useToast } from "@/components/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

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
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { toast } = useToast()
  const [updateProfile] = useMutation(UPDATE_USER)

  useEffect(() => {
    if (userData) {
      setFormData({
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        email: userData.email || "",
        phone_number: userData.phone_number || "",
        address: userData.address || "",
        date_of_birth: userData.date_of_birth || "",
        profile_picture: userData.profile_picture || "",
      })
    }
  }, [userData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: "" }))

    if (name === "address" && value.length > 2) {
      fetchAddressSuggestions(value)
    } else if (name === "address") {
      setAddressSuggestions([])
    }

    setSaveSuccess(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setPreviewImage(URL.createObjectURL(file))
      setSaveSuccess(false)
    }
  }

  const fetchAddressSuggestions = async (query: string) => {
    try {
      const response = await axios.get(`https://api-adresse.data.gouv.fr/search/?q=${query}&limit=5`)
      const suggestions = response.data.features.map((feature: any) => feature.properties.label)
      setAddressSuggestions(suggestions)
    } catch (error) {
      console.error("Erreur lors de la récupération des suggestions d'adresse:", error)
      setAddressSuggestions([])
    }
  }

  const selectAddress = (address: string) => {
    setFormData((prev) => ({ ...prev, address }))
    setAddressSuggestions([])
    setSaveSuccess(false)
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
      const birthDate = new Date(formData.date_of_birth)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()

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
    if (!validateForm()) {
      const firstErrorElement = document.querySelector(".border-red-500")
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      return
    }

    setIsUpdating(true)
    try {
      const { data } = await updateProfile({
        variables: {
          updateUserInput: {
            id: userId,
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

        setSaveSuccess(true)

        if (selectedImage) {
          setSelectedImage(null)
        }

        await refetch()

        setTimeout(() => {
          const successMessage = document.querySelector(".bg-green-50")
          if (successMessage) {
            successMessage.scrollIntoView({ behavior: "smooth", block: "center" })
          }
        }, 100)
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-4">
              <Avatar className="h-32 w-32 border-4 border-primary/10">
                {previewImage ? (
                  <AvatarImage src={previewImage} alt="Aperçu de la photo de profil" />
                ) : formData.profile_picture ? (
                  <AvatarImage
                    src={`${process.env.NEXT_PUBLIC_API_URL}${formData.profile_picture}`}
                    alt="Photo de profil"
                  />
                ) : (
                  <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                    {formData.first_name?.[0]}
                    {formData.last_name?.[0]}
                  </AvatarFallback>
                )}
              </Avatar>
              <Label
                htmlFor="picture"
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer shadow-md hover:bg-primary/90 transition-colors"
              >
                <Camera size={18} />
                <span className="sr-only">Changer la photo</span>
              </Label>
              <Input
                id="picture"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cliquez sur l'icône pour changer votre photo de profil
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="first_name" className="flex items-center gap-2 text-sm font-medium">
                <User size={16} className="text-primary/70" />
                Prénom
              </Label>
              <Input
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className={cn(errors.first_name ? "border-red-500" : "", "mt-1")}
              />
              {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>}
            </div>

            <div>
              <Label htmlFor="last_name" className="flex items-center gap-2 text-sm font-medium">
                <User size={16} className="text-primary/70" />
                Nom
              </Label>
              <Input
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className={cn(errors.last_name ? "border-red-500" : "", "mt-1")}
              />
              {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>}
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                <Mail size={16} className="text-primary/70" />
                Email
              </Label>
              <Input
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={cn(errors.email ? "border-red-500" : "", "mt-1")}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="phone_number" className="flex items-center gap-2 text-sm font-medium">
                <Phone size={16} className="text-primary/70" />
                Numéro de téléphone
              </Label>
              <Input
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className={cn(errors.phone_number ? "border-red-500" : "", "mt-1")}
              />
              {errors.phone_number && <p className="text-red-500 text-sm mt-1">{errors.phone_number}</p>}
            </div>

            <div>
              <Label htmlFor="address" className="flex items-center gap-2 text-sm font-medium">
                <MapPin size={16} className="text-primary/70" />
                Adresse
              </Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={cn(errors.address ? "border-red-500" : "", "mt-1")}
              />
              {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
              {addressSuggestions.length > 0 && (
                <ul className="border border-gray-300 mt-2 rounded-lg max-h-40 overflow-auto shadow-md z-10 relative bg-background">
                  {addressSuggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      className="p-2 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => selectAddress(suggestion)}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <Label htmlFor="date_of_birth" className="flex items-center gap-2 text-sm font-medium">
                <Calendar size={16} className="text-primary/70" />
                Date de naissance
              </Label>
              <Input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                value={formData.date_of_birth ? new Date(formData.date_of_birth).toISOString().split("T")[0] : ""}
                onChange={handleChange}
                className={cn(errors.date_of_birth ? "border-red-500" : "", "mt-1")}
              />
              {errors.date_of_birth && <p className="text-red-500 text-sm mt-1">{errors.date_of_birth}</p>}
            </div>
          </div>

          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 text-green-700 p-3 rounded-md text-sm border border-green-200"
            >
              Vos informations ont été enregistrées avec succès.
            </motion.div>
          )}
        </CardContent>
        <CardFooter className="border-t bg-muted/50 pt-4">
          <Button
            className="ml-auto hover:shadow-md transition-shadow"
            onClick={saveProfileChanges}
            disabled={isUpdating}
          >
            {isUpdating ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
