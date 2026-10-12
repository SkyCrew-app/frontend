"use client"

import type React from "react"
import { useState } from "react"
import { Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/lib/format"
import { personName, type CoursePerson } from "./course-helpers"

export interface CourseCommentItem {
  id: number
  content: string
  creationDate: string
  author: CoursePerson | null
}

interface CommentsCardProps {
  comments: CourseCommentItem[]
  // Resolves to true when the comment was saved.
  onAdd: (content: string) => Promise<boolean>
}

export function CommentsCard({ comments, onAdd }: CommentsCardProps) {
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!content.trim()) return
    setSaving(true)
    const saved = await onAdd(content.trim())
    setSaving(false)
    if (saved) setContent("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Commentaires</CardTitle>
        <CardDescription>Les échanges entre l'instructeur et l'élève à propos de ce cours.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Aucun commentaire pour le moment.
          </p>
        ) : (
          <ul className="space-y-3">
            {comments.map((comment) => (
              <li key={comment.id} className="rounded-lg bg-muted/50 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-sm font-medium">{personName(comment.author)}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(comment.creationDate)}</p>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm">{comment.content}</p>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleSubmit} className="space-y-2 border-t pt-4">
          <Label htmlFor="course-comment">Ajouter un commentaire</Label>
          <Textarea
            id="course-comment"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Ex. Bonne séance, à revoir : la tenue de l'altitude en virage."
            rows={3}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!content.trim() || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Publier le commentaire
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
