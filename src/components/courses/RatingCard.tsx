"use client"

import type React from "react"
import { useState } from "react"
import { Loader2, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const STARS = [1, 2, 3, 4, 5]

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`Note : ${value} sur 5`}>
      {STARS.map((star) => (
        <Star
          key={star}
          className={cn("h-5 w-5", star <= value ? "fill-warning text-warning" : "text-muted-foreground/40")}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

interface RatingCardProps {
  rating: number | null
  feedback: string | null
  // Rating a course is the student's part.
  canRate: boolean
  // True when the reader is the student: the wording becomes personal.
  isOwnRating: boolean
  // Resolves to true when the rating was saved.
  onRate: (rating: number, feedback: string) => Promise<boolean>
}

export function RatingCard({ rating, feedback, canRate, isOwnRating, onRate }: RatingCardProps) {
  const hasRating = Boolean(rating)
  const [isEditing, setIsEditing] = useState(false)
  const [newRating, setNewRating] = useState(0)
  const [newFeedback, setNewFeedback] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const showForm = canRate && (!hasRating || isEditing)

  const startEditing = () => {
    setNewRating(rating ?? 0)
    setNewFeedback(feedback ?? "")
    setSubmitted(false)
    setIsEditing(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (newRating === 0 || !newFeedback.trim()) return
    setSaving(true)
    const saved = await onRate(newRating, newFeedback.trim())
    setSaving(false)
    if (saved) {
      setIsEditing(false)
      setSubmitted(false)
      setNewRating(0)
      setNewFeedback("")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{isOwnRating ? "Votre avis" : "Avis de l'élève"}</CardTitle>
        <CardDescription>
          {isOwnRating ? "Notez ce cours et dites ce que vous en avez retenu." : "La note et le retour de l'élève sur ce cours."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasRating && !isEditing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Stars value={rating ?? 0} />
              <span className="text-sm font-medium tabular-nums">{rating} / 5</span>
            </div>
            {feedback && <p className="whitespace-pre-line text-sm">{feedback}</p>}
            {canRate && (
              <Button variant="outline" size="sm" onClick={startEditing}>
                Modifier l'avis
              </Button>
            )}
          </div>
        )}

        {!hasRating && !canRate && (
          <p className="text-sm text-muted-foreground">L'élève n'a pas encore donné son avis.</p>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label id="rating-label">
                Note <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-1" role="radiogroup" aria-labelledby="rating-label">
                {STARS.map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={newRating === star}
                    aria-label={`${star} sur 5`}
                    onClick={() => setNewRating(star)}
                    className="flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Star
                      className={cn(
                        "h-6 w-6",
                        star <= newRating ? "fill-warning text-warning" : "text-muted-foreground/40",
                      )}
                    />
                  </button>
                ))}
                {newRating > 0 && <span className="ml-2 text-sm tabular-nums text-muted-foreground">{newRating} / 5</span>}
              </div>
              {submitted && newRating === 0 && <p className="text-sm text-destructive">Choisissez une note.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-feedback">
                Votre retour <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="course-feedback"
                placeholder="Ex. Explications claires, j'aimerais refaire des tours de piste."
                value={newFeedback}
                onChange={(event) => setNewFeedback(event.target.value)}
                rows={4}
              />
              {submitted && !newFeedback.trim() && (
                <p className="text-sm text-destructive">Écrivez quelques mots sur le cours.</p>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {isEditing && (
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                  Annuler
                </Button>
              )}
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Envoyer l'avis
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
