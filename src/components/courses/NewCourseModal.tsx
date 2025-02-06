import { useState } from "react"
import { useMutation, useQuery } from "@apollo/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CREATE_COURSE, GET_USERS } from "@/graphql/course"

type NewCourseModalProps = {
  isOpen: boolean
  onClose: () => void
}

type User = {
  id: number
  first_name: string
  last_name: string
}

export default function NewCourseModal({ isOpen, onClose }: NewCourseModalProps) {
  const [formData, setFormData] = useState({
    instructorId: "",
    studentId: "",
    startTime: "",
    endTime: "",
  })
  const [searchInstructor, setSearchInstructor] = useState("")
  const [searchStudent, setSearchStudent] = useState("")

  const { data: userData, loading: userLoading } = useQuery(GET_USERS)
  const [createCourse] = useMutation(CREATE_COURSE, {
    refetchQueries: ["GetAllCoursesInstruction"],
  })

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
      onClose()
    } catch (error) {
      console.error("Erreur lors de la création du cours:", error)
    }
  }

  const filteredInstructors =
    userData?.getUsers.filter(
      (user: User) => user.first_name.toLowerCase().includes(searchInstructor.toLowerCase()) || user.last_name.toLowerCase().includes(searchInstructor.toLowerCase()),
    ) || []

  const filteredStudents =
    userData?.getUsers.filter(
      (user: User) => user.first_name.toLowerCase().includes(searchStudent.toLowerCase()) || user.last_name.toLowerCase().includes(searchStudent.toLowerCase()),
    ) || []

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nouveau Cours</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                  {filteredInstructors.map((instructor: User) => (
                    <SelectItem key={instructor.id} value={instructor.id.toString()}>
                      {instructor.first_name} {instructor.last_name}
                    </SelectItem>
                  ))}
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
                  {filteredStudents.map((student: User) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.first_name} {student.last_name}
                    </SelectItem>
                  ))}
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
              <Label htmlFor="endTime">Date et heure de fin</Label>
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
            <Button type="submit">Créer le cours</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

