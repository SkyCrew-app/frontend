"use client"

import { useEffect, useState } from "react"
import { useMutation } from "@apollo/client"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { AlertCircle, CalendarIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SidePanel } from "@/components/layout/SidePanel"
import { toast } from "@/components/hooks/use-toast"
import { CREATE_EXPENSE } from "@/graphql/finance"
import { formatDate, formatMoney } from "@/lib/format"
import { EXPENSE_CATEGORIES } from "./finance-shared"

interface ExpenseFormProps {
  open: boolean
  /** Called once the expense is saved. */
  onSuccess?: () => void
  /** Called when the panel is closed without saving. */
  onCancel?: () => void
}

interface FieldErrors {
  amount?: string
  category?: string
}

const RequiredMark = () => (
  <span className="text-destructive" aria-hidden="true">
    {" "}
    *
  </span>
)

/** The side panel that records an expense. */
export default function ExpenseForm({ open, onSuccess, onCancel }: ExpenseFormProps) {
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState<Date>(() => new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  const [createExpense, { loading, error, reset }] = useMutation(CREATE_EXPENSE, {
    // Saved expenses are listed per period: drop those lists so they are fetched again.
    update: (cache) => {
      cache.evict({ id: "ROOT_QUERY", fieldName: "expenseByPeriod" })
      cache.gc()
    },
  })

  // Start from a clean form each time the panel opens.
  useEffect(() => {
    if (!open) return
    setAmount("")
    setCategory("")
    setDescription("")
    setDate(new Date())
    setErrors({})
    reset()
  }, [open, reset])

  const validate = (): FieldErrors => {
    const next: FieldErrors = {}
    const value = Number.parseFloat(amount.replace(",", "."))
    if (!amount.trim()) next.amount = "Indiquez le montant de la dépense."
    else if (Number.isNaN(value) || value <= 0) next.amount = "Le montant doit être supérieur à 0 €."
    if (!category) next.category = "Choisissez une catégorie."
    return next
  }

  const handleSubmit = async () => {
    if (loading) return

    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const value = Number.parseFloat(amount.replace(",", "."))

    try {
      await createExpense({
        variables: {
          input: {
            // The day picked in the calendar, in local time (toISOString would shift it to the day before).
            expense_date: format(date, "yyyy-MM-dd"),
            amount: value,
            category,
            description,
          },
        },
      })

      toast({
        title: "Dépense enregistrée",
        description: `${formatMoney(value)} le ${formatDate(date)}.`,
      })

      setAmount("")
      setCategory("")
      setDescription("")
      setDate(new Date())
      onSuccess?.()
    } catch {
      // The failure is shown by the alert below, from the mutation error.
    }
  }

  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => !next && !loading && onCancel?.()}
      title="Ajouter une dépense"
      description="Elle sera comptée dans les dépenses de la période correspondante."
      onSubmit={handleSubmit}
      submitLabel="Enregistrer la dépense"
      submitting={loading}
      size="md"
    >
      <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expense-amount">
                Montant
                <RequiredMark />
              </Label>
              <div className="relative">
                <Input
                  id="expense-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="120,50"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    if (errors.amount) setErrors((current) => ({ ...current, amount: undefined }))
                  }}
                  required
                  aria-invalid={Boolean(errors.amount)}
                  aria-describedby={errors.amount ? "expense-amount-error" : undefined}
                  className="pr-8 tabular-nums"
                />
                <span
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                  aria-hidden="true"
                >
                  €
                </span>
              </div>
              {errors.amount && (
                <p id="expense-amount-error" className="text-sm text-destructive">
                  {errors.amount}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-date">
                Date
                <RequiredMark />
              </Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button id="expense-date" type="button" variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    {formatDate(date)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(selected) => {
                      if (selected) {
                        setDate(selected)
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
            <Label htmlFor="expense-category">
              Catégorie
              <RequiredMark />
            </Label>
            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value)
                if (errors.category) setErrors((current) => ({ ...current, category: undefined }))
              }}
            >
              <SelectTrigger
                id="expense-category"
                aria-invalid={Boolean(errors.category)}
                aria-describedby={errors.category ? "expense-category-error" : undefined}
              >
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p id="expense-category-error" className="text-sm text-destructive">
                {errors.category}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-description">Description</Label>
            <Textarea
              id="expense-description"
              placeholder="Ex. : visite des 50 heures du F-GABC"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>La dépense n'a pas pu être enregistrée. Réessayez dans un instant.</AlertDescription>
            </Alert>
          )}
      </div>
    </SidePanel>
  )
}
