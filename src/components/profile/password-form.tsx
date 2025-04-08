"use client"

import React, { useState } from "react"
import { useMutation } from "@apollo/client"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from 'lucide-react'
import { UPDATE_PASSWORD } from "@/graphql/user"
import { useToast } from "@/components/hooks/use-toast"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface PasswordFormProps {
  userId: string | null
}

export function PasswordForm({ userId }: PasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const { toast } = useToast()
  const [updatePassword] = useMutation(UPDATE_PASSWORD)

  const validateForm = () => {
    let valid = true
    const newErrors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }

    if (!currentPassword) {
      valid = false
      newErrors.currentPassword = "Le mot de passe actuel est requis."
    }

    if (!newPassword) {
      valid = false
      newErrors.newPassword = "Le nouveau mot de passe est requis."
    } else if (newPassword.length < 8) {
      valid = false
      newErrors.newPassword = "Le nouveau mot de passe doit contenir au moins 8 caractères."
    }

    if (!confirmPassword) {
      valid = false
      newErrors.confirmPassword = "La confirmation du mot de passe est requise."
    } else if (newPassword !== confirmPassword) {
      valid = false
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas."
    }

    setErrors(newErrors)
    return valid
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsUpdating(true)
    try {
      const { data } = await updatePassword({
        variables: {
          userId: userId,
          currentPassword,
          newPassword,
        },
      })

      if (data?.updatePassword?.success) {
        toast({
          title: "Succès",
          description: "Votre mot de passe a été modifié avec succès.",
        })

        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setSaveSuccess(true)
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: data?.updatePassword?.message || "Erreur lors de la modification du mot de passe.",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de la modification du mot de passe.",
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
          <CardTitle className="text-xl font-semibold">Changer le mot de passe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="currentPassword" className="text-sm font-medium">Mot de passe actuel</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={cn(errors.currentPassword ? "border-red-500" : "", "mt-1 pr-10")}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showCurrentPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.currentPassword && <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>}
          </div>

          <div>
            <Label htmlFor="newPassword" className="text-sm font-medium">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={cn(errors.newPassword ? "border-red-500" : "", "mt-1 pr-10")}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showNewPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>}
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmer le nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(errors.confirmPassword ? "border-red-500" : "", "mt-1 pr-10")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
          </div>

          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 text-green-700 p-3 rounded-md text-sm border border-green-200"
            >
              Votre mot de passe a été modifié avec succès.
            </motion.div>
          )}
        </CardContent>
        <CardFooter className="border-t bg-muted/50 pt-4">
          <Button
            className="ml-auto hover:shadow-md transition-shadow"
            onClick={handleSubmit}
            disabled={isUpdating}
          >
            {isUpdating ? "Modification en cours..." : "Changer le mot de passe"}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
