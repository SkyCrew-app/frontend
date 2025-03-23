"use client"

import type React from "react"

import { useState } from "react"
import { useMutation } from "@apollo/client"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CREATE_EXPENSE } from "@/graphql/finance"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  PlusCircle,
  Receipt,
  Banknote,
  Tag,
  FileText,
  CalendarIcon,
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function ExpenseForm() {
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const [success, setSuccess] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const [createExpense, { loading, error }] = useMutation(CREATE_EXPENSE)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess(false)

    try {
      await createExpense({
        variables: {
          input: {
            expense_date: date.toISOString().split("T")[0],
            amount: Number.parseFloat(amount),
            category,
            description,
          },
        },
      })

      // Reset form
      setAmount("")
      setCategory("")
      setDescription("")
      setDate(new Date())
      setSuccess(true)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("Error creating expense:", err)
    }
  }

  const categories = [
    { value: "maintenance", label: "Maintenance", icon: <Receipt className="h-4 w-4 text-blue-500" /> },
    { value: "carburant", label: "Carburant", icon: <Receipt className="h-4 w-4 text-orange-500" /> },
    { value: "assurance", label: "Assurance", icon: <Receipt className="h-4 w-4 text-green-500" /> },
    { value: "salaires", label: "Salaires", icon: <Receipt className="h-4 w-4 text-purple-500" /> },
    { value: "autres", label: "Autres", icon: <Receipt className="h-4 w-4 text-gray-500" /> },
  ]

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-t-lg">
          <CardTitle className="flex items-center text-xl">
            <PlusCircle className="mr-2 h-5 w-5 text-blue-500" />
            Ajouter une Dépense
          </CardTitle>
          <CardDescription>Enregistrez une nouvelle dépense pour le suivi financier de l'aéroclub</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="amount" className="flex items-center text-sm font-medium">
                  <Banknote className="mr-2 h-4 w-4 text-muted-foreground" />
                  Montant
                </Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="pl-8"
                    step="0.01"
                    min="0"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center text-sm font-medium">
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  Date de la dépense
                </Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <div
                      className={cn(
                        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                        "ring-offset-background placeholder:text-muted-foreground focus:outline-none",
                        "focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        "cursor-pointer",
                      )}
                      onClick={() => setIsCalendarOpen(true)}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: fr }) : <span>Sélectionner une date</span>}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(date) => {
                        if (date) {
                          setDate(date)
                          setIsCalendarOpen(false)
                        }
                      }}
                      initialFocus
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="flex items-center text-sm font-medium">
                <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                Catégorie de dépense
              </Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="flex items-center">
                      <div className="flex items-center">
                        {cat.icon}
                        <span className="ml-2">{cat.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center text-sm font-medium">
                <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Détails de la dépense..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle>Succès</AlertTitle>
                <AlertDescription>La dépense a été ajoutée avec succès!</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
        <CardFooter className="bg-muted/30 flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setAmount("")
              setCategory("")
              setDescription("")
              setDate(new Date())
            }}
          >
            Réinitialiser
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !amount || !category}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter la Dépense
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
