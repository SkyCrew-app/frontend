"use client"

import { useState } from "react"
import { useMutation } from "@apollo/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CREATE_EXPENSE } from "@/graphql/finance"

export default function ExpenseForm() {
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")

  const [createExpense, { data, loading, error }] = useMutation(CREATE_EXPENSE)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createExpense({
        variables: {
          input: {
            expense_date: new Date().toISOString().split("T")[0],
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
    } catch (err) {
      console.error("Error creating expense:", err)
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Ajouter une Dépense</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="number"
            placeholder="Montant"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Catégorie de dépense" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="carburant">Carburant</SelectItem>
              <SelectItem value="assurance">Assurance</SelectItem>
              <SelectItem value="salaires">Salaires</SelectItem>
              <SelectItem value="autres">Autres</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button type="submit" disabled={loading}>
            {loading ? "Ajout en cours..." : "Ajouter la Dépense"}
          </Button>
        </form>
        {error && <p className="text-red-500 mt-2">Erreur: {error.message}</p>}
        {data && <p className="text-green-500 mt-2">Dépense ajoutée avec succès!</p>}
      </CardContent>
    </Card>
  )
}
