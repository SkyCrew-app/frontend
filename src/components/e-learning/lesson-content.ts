import { escapeHtml } from "@/lib/sanitize-html"

export interface LessonSection {
  heading: string
  body: string
}

// A lesson is stored either as rich text (HTML) or as a list of titled
// sections; the API may also hand the sections over as a JSON string.
const parse = (content: unknown): unknown => {
  if (typeof content !== "string") return content
  const text = content.trim()
  if (!text.startsWith("{")) return content
  try {
    return JSON.parse(text)
  } catch {
    return content
  }
}

// The titled sections of a lesson, empty when it is written as rich text.
export function lessonSections(content: unknown): LessonSection[] {
  const value = parse(content)
  if (!value || typeof value !== "object") return []
  const sections = (value as { sections?: unknown }).sections
  if (!Array.isArray(sections)) return []
  return sections
    .filter((section): section is Record<string, unknown> => !!section && typeof section === "object")
    .map((section) => ({
      heading: typeof section.heading === "string" ? section.heading : "",
      body: typeof section.body === "string" ? section.body : "",
    }))
    .filter((section) => section.heading || section.body)
}

interface DocNode {
  type?: unknown
  text?: unknown
  attrs?: Record<string, unknown>
  marks?: { type?: unknown; attrs?: Record<string, unknown> }[]
  content?: unknown
}

const BLOCK_TAGS: Record<string, string> = {
  paragraph: "p",
  bulletList: "ul",
  orderedList: "ol",
  listItem: "li",
  blockquote: "blockquote",
}

const MARK_TAGS: Record<string, string> = { bold: "strong", italic: "em", underline: "u", strike: "s", code: "code" }

const textHtml = (node: DocNode): string => {
  let html = escapeHtml(node.text)
  for (const mark of node.marks ?? []) {
    if (mark?.type === "link" && typeof mark.attrs?.href === "string") {
      html = `<a href="${escapeHtml(mark.attrs.href)}">${html}</a>`
    } else if (typeof mark?.type === "string" && MARK_TAGS[mark.type]) {
      const tag = MARK_TAGS[mark.type]
      html = `<${tag}>${html}</${tag}>`
    }
  }
  return html
}

// A lesson written in the editor's own format (a ProseMirror document), as HTML.
const nodeHtml = (node: DocNode): string => {
  if (!node || typeof node !== "object") return ""
  const children = Array.isArray(node.content) ? (node.content as DocNode[]).map(nodeHtml).join("") : ""
  switch (node.type) {
    case "doc":
      return children
    case "text":
      return textHtml(node)
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 2, 1), 6)
      return `<h${level}>${children}</h${level}>`
    }
    case "codeBlock":
      return `<pre><code>${children}</code></pre>`
    case "hardBreak":
      return "<br>"
    case "horizontalRule":
      return "<hr>"
    case "image":
      return typeof node.attrs?.src === "string"
        ? `<img src="${escapeHtml(node.attrs.src)}" alt="${escapeHtml(node.attrs?.alt ?? "")}">`
        : ""
    default: {
      const tag = typeof node.type === "string" ? BLOCK_TAGS[node.type] : undefined
      return tag ? `<${tag}>${children}</${tag}>` : children
    }
  }
}

// True when a document holds some text or an image.
const hasContent = (node: DocNode): boolean => {
  if (!node || typeof node !== "object") return false
  if (node.type === "text") return typeof node.text === "string" && node.text.trim() !== ""
  if (node.type === "image") return typeof node.attrs?.src === "string"
  return Array.isArray(node.content) && (node.content as DocNode[]).some(hasContent)
}

const isDocument = (value: unknown): value is DocNode =>
  !!value && typeof value === "object" && (value as DocNode).type === "doc"

// The rich text of a lesson, null when it has none.
export function lessonHtml(content: unknown): string | null {
  const value = parse(content)
  if (isDocument(value)) {
    return hasContent(value) ? nodeHtml(value) : null
  }
  return typeof value === "string" && value.trim() !== "" ? value : null
}

// A lesson as the rich-text editor can open it, whatever the way it was stored.
export function lessonEditorHtml(content: unknown): string {
  const html = lessonHtml(content)
  if (html !== null) return html
  return lessonSections(content)
    .map(
      (section) =>
        (section.heading ? `<h3>${escapeHtml(section.heading)}</h3>` : "") +
        section.body
          .split(/\n+/)
          .filter((paragraph) => paragraph.trim() !== "")
          .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
          .join(""),
    )
    .join("")
}
