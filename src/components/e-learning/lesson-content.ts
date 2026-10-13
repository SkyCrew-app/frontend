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

// The rich text of a lesson, null when it has none.
export function lessonHtml(content: unknown): string | null {
  const value = parse(content)
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
