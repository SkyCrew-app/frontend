import { lessonEditorHtml, lessonHtml, lessonSections } from "../lesson-content"

const sections = { title: "Météo", sections: [{ heading: "Les fronts", body: "Un front chaud.\nUn front froid." }] }

describe("lessonSections", () => {
  it("lit les sections d'une leçon structurée", () => {
    expect(lessonSections(sections)).toEqual(sections.sections)
  })

  it("lit les sections reçues sous forme de texte JSON", () => {
    expect(lessonSections(JSON.stringify(sections))).toEqual(sections.sections)
  })

  it("n'en trouve pas dans un texte riche ou un contenu absent", () => {
    expect(lessonSections("<p>Bonjour</p>")).toEqual([])
    expect(lessonSections(null)).toEqual([])
    expect(lessonSections({ sections: "non" })).toEqual([])
  })
})

describe("lessonHtml", () => {
  it("rend le texte riche tel quel", () => {
    expect(lessonHtml("<p>Bonjour</p>")).toBe("<p>Bonjour</p>")
  })

  it("rend un document de l'éditeur (format ProseMirror), sans interpréter son texte", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Les forces" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "La " },
            { type: "text", text: "portance", marks: [{ type: "bold" }] },
            { type: "text", text: " <b>", marks: [{ type: "link", attrs: { href: "https://a.fr" } }] },
          ],
        },
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Poids" }] }] }] },
      ],
    }
    expect(lessonHtml(doc)).toBe(
      '<h2>Les forces</h2><p>La <strong>portance</strong><a href="https://a.fr"> &lt;b&gt;</a></p><ul><li><p>Poids</p></li></ul>',
    )
    expect(lessonHtml(JSON.stringify(doc))).toBe(lessonHtml(doc))
    expect(lessonEditorHtml(doc)).toBe(lessonHtml(doc))
    expect(lessonHtml({ type: "doc", content: [{ type: "paragraph" }] })).toBeNull()
  })

  it("vaut null sans texte riche", () => {
    expect(lessonHtml("  ")).toBeNull()
    expect(lessonHtml(sections)).toBeNull()
    expect(lessonHtml(JSON.stringify(sections))).toBeNull()
  })
})

describe("lessonEditorHtml", () => {
  it("garde le texte riche", () => {
    expect(lessonEditorHtml("<p>Bonjour</p>")).toBe("<p>Bonjour</p>")
  })

  it("transforme les sections en texte riche, sans interpréter leur contenu", () => {
    expect(lessonEditorHtml(sections)).toBe("<h3>Les fronts</h3><p>Un front chaud.</p><p>Un front froid.</p>")
    expect(lessonEditorHtml({ sections: [{ heading: "a < b", body: "" }] })).toBe("<h3>a &lt; b</h3>")
  })

  it("vaut une chaîne vide sans contenu", () => {
    expect(lessonEditorHtml(null)).toBe("")
  })
})
