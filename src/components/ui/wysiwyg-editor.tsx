"use client"

import i18n from "@/lib/i18n"
import { useEditor, EditorContent } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  LinkIcon,
  ImageIcon,
  Code,
  Quote,
  Pilcrow,
} from "lucide-react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface WysiwygEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function WysiwygEditor({
  value,
  onChange,
  placeholder = i18n.t("common:editor.placeholder"),
  className,
}: WysiwygEditorProps) {
  const [linkUrl, setLinkUrl] = useState("")
  const [imageUrl, setImageUrl] = useState("")

  const editor = useEditor({
    // Rendered in the browser only: the page is also rendered on the server.
    immediatelyRender: false,
    // The toolbar shows what is active at the cursor.
    shouldRerenderOnTransaction: true,
    extensions: [
      // The starter kit brings its own link: the one configured below is used.
      StarterKit.configure({ link: false }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-info underline cursor-pointer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-md max-w-full h-auto my-4",
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  if (!editor) {
    return null
  }

  const addLink = () => {
    if (linkUrl) {
      const href = /^(https?:\/\/|mailto:|tel:|\/)/i.test(linkUrl) ? linkUrl : `https://${linkUrl}`
      if (editor.state.selection.empty && !editor.isActive("link")) {
        // Nothing selected: the address itself becomes the link text.
        editor
          .chain()
          .focus()
          .insertContent({ type: "text", text: linkUrl, marks: [{ type: "link", attrs: { href } }] })
          .run()
      } else {
        editor.chain().focus().extendMarkRange("link").setLink({ href }).run()
      }
      setLinkUrl("")
    }
  }

  const addImage = () => {
    if (imageUrl) {
      editor.chain().focus().insertContent(`<img src="${imageUrl}" alt="${i18n.t("common:editor.imageAlt")}" />`).run()
      setImageUrl("")
    }
  }

  return (
    <div className={`border rounded-md ${className ?? ""}`}>
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/20">
        <Toggle
          size="sm"
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label={i18n.t("common:editor.bold")}
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label={i18n.t("common:editor.italic")}
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("bulletList")}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label={i18n.t("common:editor.bulletList")}
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("orderedList")}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label={i18n.t("common:editor.orderedList")}
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 1 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          aria-label={i18n.t("common:editor.heading1")}
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label={i18n.t("common:editor.heading2")}
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 3 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-label={i18n.t("common:editor.heading3")}
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("blockquote")}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label={i18n.t("common:editor.quote")}
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("codeBlock")}
          onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()}
          aria-label={i18n.t("common:editor.codeBlock")}
        >
          <Code className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("paragraph")}
          onPressedChange={() => editor.chain().focus().setParagraph().run()}
          aria-label={i18n.t("common:editor.paragraph")}
        >
          <Pilcrow className="h-4 w-4" />
        </Toggle>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              aria-label={i18n.t("common:editor.link")}
              title={i18n.t("common:editor.link")}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="flex flex-col gap-2">
              <Input
                type="url"
                placeholder={i18n.t("common:editor.linkPlaceholder")}
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <Button type="button" size="sm" onClick={addLink}>
                {i18n.t("common:editor.addLink")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              aria-label={i18n.t("common:editor.image")}
              title={i18n.t("common:editor.image")}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="flex flex-col gap-2">
              <Input
                type="url"
                placeholder={i18n.t("common:editor.imagePlaceholder")}
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <Button type="button" size="sm" onClick={addImage}>
                {i18n.t("common:editor.addImage")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={i18n.t("common:editor.undo")}
            title={i18n.t("common:editor.undo")}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-8"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={i18n.t("common:editor.redo")}
            title={i18n.t("common:editor.redo")}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="h-8"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* The text area fills the editor (a tap anywhere in it writes) and shows its placeholder while empty. */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 dark:prose-invert [&_.ProseMirror]:min-h-[168px] [&_.ProseMirror]:outline-none [&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-muted-foreground [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]"
      />

      {editor && (
        <BubbleMenu editor={editor}>
          <div className="flex bg-card p-1 rounded-md shadow-lg border">
            <Toggle
              size="sm"
              pressed={editor.isActive("bold")}
              onPressedChange={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("italic")}
              onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Toggle>
          </div>
        </BubbleMenu>
      )}
    </div>
  )
}
