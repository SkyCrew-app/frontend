"use client"

import type React from "react"
import { useState } from "react"
import { Loader2, Star } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const STARS = [1, 2, 3, 4, 5]

function Stars({ value }: { value: number }) {
  const { t } = useTranslation("instruction")
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={t("courses.rating.starsAria", { value })}>
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
  const { t } = useTranslation("instruction")
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
        <CardTitle className="text-lg">{isOwnRating ? t("courses.rating.title.own") : t("courses.rating.title.student")}</CardTitle>
        <CardDescription>
          {isOwnRating ? t("courses.rating.description.own") : t("courses.rating.description.student")}
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
                {t("courses.rating.edit")}
              </Button>
            )}
          </div>
        )}

        {!hasRating && !canRate && (
          <p className="text-sm text-muted-foreground">{t("courses.rating.none")}</p>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label id="rating-label">
                {t("courses.rating.label")} <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2" role="radiogroup" aria-labelledby="rating-label">
                {STARS.map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={newRating === star}
                    aria-label={t("courses.rating.starAria", { value: star })}
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
              {submitted && newRating === 0 && <p className="text-sm text-destructive">{t("courses.rating.errorRating")}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-feedback">
                {t("courses.rating.feedbackLabel")} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="course-feedback"
                placeholder={t("courses.rating.feedbackPlaceholder")}
                value={newFeedback}
                onChange={(event) => setNewFeedback(event.target.value)}
                rows={4}
              />
              {submitted && !newFeedback.trim() && (
                <p className="text-sm text-destructive">{t("courses.rating.errorFeedback")}</p>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              {isEditing && (
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                  {t("common:actions.cancel")}
                </Button>
              )}
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("courses.rating.submit")}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
