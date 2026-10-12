import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { ArticleCard } from "../article-card"
import { ArticleImage, articleFileName, articleFileUrl } from "../article-image"

jest.mock("@/lib/runtime-config", () => ({
  getBackendBaseUrl: () => "http://api.test",
}))

const article = {
  id: "7",
  title: "Journée portes ouvertes",
  description: "Venez découvrir l'aéroclub.",
  text: "<p>Programme</p>",
  tags: ["Événements", "Actualités", "Formation", "Sécurité"],
  photo_url: null,
  createdAt: "2026-10-01T08:00:00.000Z",
  eventDate: null,
}

describe("articleFileUrl", () => {
  it("doit préfixer les fichiers servis par l'API", () => {
    expect(articleFileUrl("/uploads/a.jpg")).toBe("http://api.test/uploads/a.jpg")
    expect(articleFileUrl("uploads/a.jpg")).toBe("http://api.test/uploads/a.jpg")
  })

  it("doit laisser les adresses complètes telles quelles et ignorer l'absence de fichier", () => {
    expect(articleFileUrl("https://cdn.test/a.jpg")).toBe("https://cdn.test/a.jpg")
    expect(articleFileUrl(null)).toBeNull()
    expect(articleFileUrl("")).toBeNull()
  })

  it("doit extraire un nom de fichier lisible", () => {
    expect(articleFileName("/uploads/articles/programme%20juin.pdf")).toBe("programme juin.pdf")
  })
})

describe("ArticleImage", () => {
  it("doit afficher le bloc sans image quand l'article n'a pas d'image", () => {
    render(<ArticleImage src={null} alt="Illustration" />)

    expect(screen.getByTestId("article-image-fallback")).toBeInTheDocument()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("doit afficher l'image de l'API avec son texte alternatif", () => {
    render(<ArticleImage src="/uploads/a.jpg" alt="Illustration" />)

    const image = screen.getByRole("img", { name: "Illustration" })
    expect(image).toHaveAttribute("src", "http://api.test/uploads/a.jpg")
  })

  it("doit revenir au bloc sans image quand le fichier ne se charge pas", () => {
    render(<ArticleImage src="/uploads/absent.jpg" alt="Illustration" />)

    fireEvent.error(screen.getByRole("img", { name: "Illustration" }))

    expect(screen.getByTestId("article-image-fallback")).toBeInTheDocument()
  })
})

describe("ArticleCard", () => {
  it.each(["grid", "list"] as const)("doit mener à l'article et garder la même anatomie en vue %s", (viewMode) => {
    render(<ArticleCard article={article} viewMode={viewMode} />)

    expect(screen.getByRole("link")).toHaveAttribute("href", "/articles/7")
    expect(screen.getByRole("heading", { name: "Journée portes ouvertes" })).toBeInTheDocument()
    expect(screen.getByText("Venez découvrir l'aéroclub.")).toBeInTheDocument()
    expect(screen.getByText("Publié le 1 oct. 2026")).toBeInTheDocument()
    expect(screen.getByTestId("article-image-fallback")).toBeInTheDocument()
    // Three themes shown, the rest counted.
    expect(screen.getByText("Formation")).toBeInTheDocument()
    expect(screen.queryByText("Sécurité")).not.toBeInTheDocument()
    expect(screen.getByText("+1")).toBeInTheDocument()
  })

  it("doit mettre en avant la date de l'événement quand il y en a une", () => {
    render(<ArticleCard article={{ ...article, eventDate: "2026-11-14T12:00:00.000Z" }} viewMode="grid" />)

    expect(screen.getByText("Événement du 14 nov. 2026")).toBeInTheDocument()
  })
})
