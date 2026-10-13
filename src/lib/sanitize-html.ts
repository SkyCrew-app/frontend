import createDOMPurify, { type DOMPurify } from "dompurify"

// Rich text (articles, e-learning lessons) is written with the Tiptap
// editors of the administration and filtered by the API when it is saved.
// It is filtered again here, just before it is shown: only what those
// editors produce is kept. Keep this list in step with the API
// (backend: src/common/html/sanitize-rich-text.ts).
const ALLOWED_TAGS = [
  "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "del", "code", "pre", "blockquote",
  "ul", "ol", "li", "a", "img", "span",
]

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "target", "rel", "class"],
  img: ["src", "alt", "title", "width", "height", "class"],
  ol: ["start"],
  span: ["style"],
  code: ["class"],
}

// The classes the editors put on their own output.
const ALLOWED_CLASSES: Record<string, (name: string) => boolean> = {
  a: (name) => ["text-info", "underline", "cursor-pointer"].includes(name),
  img: (name) => ["rounded-md", "max-w-full", "h-auto", "my-4"].includes(name),
  code: (name) => /^language-[\w-]+$/.test(name),
}

const ALLOWED_STYLES: Record<string, RegExp[]> = {
  color: [
    /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
    /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i,
  ],
  "font-size": [/^\d{1,3}(?:\.\d{1,2})?(?:px|pt|em|rem|%)$/i],
}

const LINK_SCHEMES = ["http", "https", "mailto"]
const IMAGE_SCHEMES = ["http", "https"]

// A relative address is kept; an absolute one needs an allowed scheme.
const isAllowedUrl = (url: string, schemes: string[]) => {
  // Browsers ignore control characters and spaces inside a scheme.
  // eslint-disable-next-line no-control-regex
  const compact = url.replace(/[\u0000- ]+/g, "")
  if (compact.startsWith("//")) return false
  const scheme = compact.match(/^([a-z][a-z0-9.+-]*):/i)
  return !scheme || schemes.includes(scheme[1].toLowerCase())
}

const filterStyle = (style: string) =>
  style
    .split(";")
    .map((declaration) => {
      const separator = declaration.indexOf(":")
      if (separator === -1) return null
      const property = declaration.slice(0, separator).trim().toLowerCase()
      const value = declaration.slice(separator + 1).trim()
      return ALLOWED_STYLES[property]?.some((pattern) => pattern.test(value)) ? `${property}: ${value}` : null
    })
    .filter(Boolean)
    .join("; ")

let purifier: DOMPurify | null = null

// Built on first use, in the browser only: there is no document on the server.
const getPurifier = (): DOMPurify | null => {
  if (purifier) return purifier
  if (typeof window === "undefined") return null

  const instance = createDOMPurify(window)
  if (!instance.isSupported) return null

  instance.addHook("uponSanitizeAttribute", (node, data) => {
    const tag = node.nodeName.toLowerCase()
    const name = data.attrName.toLowerCase()

    if (!ALLOWED_ATTRIBUTES[tag]?.includes(name)) {
      data.keepAttr = false
      return
    }

    if (name === "href") data.keepAttr = isAllowedUrl(data.attrValue, LINK_SCHEMES)
    if (name === "src") data.keepAttr = isAllowedUrl(data.attrValue, IMAGE_SCHEMES)

    if (name === "class") {
      data.attrValue = data.attrValue.split(/\s+/).filter((item) => ALLOWED_CLASSES[tag]?.(item)).join(" ")
      data.keepAttr = data.attrValue !== ""
    }

    if (name === "style") {
      data.attrValue = filterStyle(data.attrValue)
      data.keepAttr = data.attrValue !== ""
    }
  })

  instance.addHook("afterSanitizeAttributes", (node) => {
    if (node.nodeName.toLowerCase() !== "a") return
    // A link never hands the opener to the page it leads to.
    node.setAttribute("rel", "noopener noreferrer")
    if (node.getAttribute("target") !== "_blank") node.removeAttribute("target")
  })

  purifier = instance
  return instance
}

// Rich text that is safe to hand to dangerouslySetInnerHTML. Empty where
// it cannot be filtered (server rendering): never the raw text.
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return ""
  const instance = getPurifier()
  if (!instance) return ""

  return instance.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [...new Set(Object.values(ALLOWED_ATTRIBUTES).flat())],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  })
}

// A value written into a generated style sheet (chart colours): a colour or
// a var(), never something that could close the rule or the style element.
export const safeCssValue = (value: string | null | undefined): string | null =>
  value && /^[\w#%.,()\s/+-]+$/.test(value) ? value : null

// Plain text placed inside HTML built by hand (map markers, print window).
export const escapeHtml = (text: unknown): string =>
  String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
