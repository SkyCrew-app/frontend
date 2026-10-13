"use client"

import type React from "react"
import { useState } from "react"
import { Loader2, MessageSquare } from "lucide-react"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation("instruction")
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
        <CardTitle className="text-lg">{t("courses.comments.title")}</CardTitle>
        <CardDescription>{t("courses.comments.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            {t("courses.comments.empty")}
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
          <Label htmlFor="course-comment">{t("courses.comments.label")}</Label>
          <Textarea
            id="course-comment"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={t("courses.comments.placeholder")}
            rows={3}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!content.trim() || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("courses.comments.submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
