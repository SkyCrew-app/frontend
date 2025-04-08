"use client"

import type React from "react"

import { useState } from "react"
import { useMutation, useQuery } from "@apollo/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CREATE_COURSE, GET_USERS } from "@/graphql/course"
import { Spinner } from "@/components/ui/spinner"

type NewCourseModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

type UserType = {
  id: number
  first_name: string
  last_name: string
  email?: string
}

export default function NewCourseModal({ isOpen, onClose, onSuccess }: NewCourseModalProps) {
  const [formData, setFormData] = useState({
    instructorId: "",
    studentId: "",
    startTime: "",
    endTime: "",
  })
  const [searchInstructor, setSearchInstructor] = useState("")
  const [searchStudent, setSearchStudent] = useState("")

  const { data: userData, loading: userLoading } = useQuery(GET_USERS)
  const [createCourse, { loading: createLoading }] = useMutation(CREATE_COURSE, {
    onCompleted: () => {
      if (onSuccess) {
        onSuccess()
      }
      resetForm()
      onClose()
    },
  })

  const resetForm = () => {
    setFormData({
      instructorId: "",
      studentId: "",
      startTime: "",
      endTime: "",
    })
    setSearchInstructor("")
    setSearchStudent("")
  }

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createCourse({
        variables: {
          input: {
            instructorId: Number.parseInt(formData.instructorId),
            studentId: Number.parseInt(formData.studentId),
            startTime: new Date(formData.startTime).toISOString(),
            endTime: formData.endTime ? new Date(formData.endTime).toISOString() : null,
          },
        },
      })
    } catch (error) {
      console.error("Erreur lors de la création du cours:", error)
    }
  }

  const filteredInstructors =
    userData?.getUsers.filter(
      (user: UserType) =>
        user.first_name.toLowerCase().includes(searchInstructor.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchInstructor.toLowerCase()),
    ) || []

  const filteredStudents =
    userData?.getUsers.filter(
      (user: UserType) =>
        user.first_name.toLowerCase().includes(searchStudent.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchStudent.toLowerCase()),
    ) || []

  const isFormValid = formData.instructorId && formData.studentId && formData.startTime

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetForm()
        }
        onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau Cours</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="instructorId">Instructeur</Label>
              <Select onValueChange={(value) => handleInputChange("instructorId", value)} value={formData.instructorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un instructeur" />
                </SelectTrigger>
                <SelectContent>
                  <Input
                    placeholder="Rechercher un instructeur"
                    value={searchInstructor}
                    onChange={(e) => setSearchInstructor(e.target.value)}
                    className="mb-2"
                  />
                  {userLoading ? (
                    <div className="flex items-center justify-center p-2">
                      <Spinner className="mr-2" />
                      Chargement...
                    </div>
                  ) : filteredInstructors.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">Aucun instructeur trouvé</div>
                  ) : (
                    filteredInstructors.map((instructor: UserType) => (
                      <SelectItem key={instructor.id} value={instructor.id.toString()}>
                        {instructor.first_name} {instructor.last_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="studentId">Élève</Label>
              <Select onValueChange={(value) => handleInputChange("studentId", value)} value={formData.studentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un élève" />
                </SelectTrigger>
                <SelectContent>
                  <Input
                    placeholder="Rechercher un élève"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    className="mb-2"
                  />
                  {userLoading ? (
                    <div className="flex items-center justify-center p-2">
                      <Spinner className="mr-2" />
                      Chargement...
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">Aucun élève trouvé</div>
                  ) : (
                    filteredStudents.map((student: UserType) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.first_name} {student.last_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startTime">Date et heure de début</Label>
              <Input
                id="startTime"
                name="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => handleInputChange("startTime", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="endTime">Date et heure de fin (optionnel)</Label>
              <Input
                id="endTime"
                name="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => handleInputChange("endTime", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!isFormValid || createLoading}>
              {createLoading ? (
                <>
                  <Spinner className="mr-2" />
                  Création en cours...
                </>
              ) : (
                "Créer le cours"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
