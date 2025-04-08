"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Plus, Paperclip, FileText, LinkIcon } from "lucide-react"

interface AttachmentsInputProps {
  value: string[]
  onChange: (value: string[]) => void
  className?: string
}

export function AttachmentsInput({ value, onChange, className }: AttachmentsInputProps) {
  const [newAttachment, setNewAttachment] = useState("")

  const addAttachment = () => {
    if (newAttachment && !value.includes(newAttachment)) {
      onChange([...value, newAttachment])
      setNewAttachment("")
    }
  }

  const removeAttachment = (index: number) => {
    const newAttachments = [...value]
    newAttachments.splice(index, 1)
    onChange(newAttachments)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addAttachment()
    }
  }

  // Fonction pour extraire le nom du fichier à partir de l'URL
  const getFileName = (url: string) => {
    try {
      const fileName = url.split("/").pop() || "fichier"
      // Tronquer le nom s'il est trop long
      return fileName.length > 25 ? fileName.substring(0, 22) + "..." : fileName
    } catch (error) {
      return "fichier"
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Paperclip className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="URL de la pièce jointe"
            value={newAttachment}
            onChange={(e) => setNewAttachment(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-8"
          />
        </div>
        <Button type="button" variant="outline" size="icon" onClick={addAttachment} disabled={!newAttachment}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {value.length > 0 && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="text-sm font-medium">Pièces jointes ({value.length})</div>
          <ul className="space-y-2">
            {value.map((url, index) => (
              <li
                key={index}
                className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{getFileName(url)}</span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer" title="Ouvrir le lien">
                      <LinkIcon className="h-3 w-3" />
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => removeAttachment(index)}
                    title="Supprimer"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
