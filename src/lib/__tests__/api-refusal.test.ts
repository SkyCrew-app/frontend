import { ApolloError } from "@apollo/client"
import { GraphQLError } from "graphql"
import { apiRefusal, isAccessRefusal } from "../api-refusal"

const refusal = (message: string) => new ApolloError({ graphQLErrors: [new GraphQLError(message)] })

describe("apiRefusal", () => {
  it("shows what the API answered to the member", () => {
    expect(apiRefusal(refusal("Ce vol est déjà clôturé"), "Erreur")).toBe("Ce vol est déjà clôturé")
  })

  it.each(["Bad Request Exception", "Internal server error", "Forbidden resource", ""])(
    "keeps the plain message for %p",
    (message) => {
      expect(apiRefusal(refusal(message), "Réessayez")).toBe("Réessayez")
    },
  )

  it("keeps the plain message when the API did not answer", () => {
    expect(apiRefusal(new ApolloError({ networkError: new Error("offline") }), "Réessayez")).toBe("Réessayez")
    expect(apiRefusal(new Error("boom"), "Réessayez")).toBe("Réessayez")
  })
})

describe("isAccessRefusal", () => {
  const refusal = (extensions: Record<string, unknown>) =>
    new ApolloError({ graphQLErrors: [new GraphQLError("refusé", { extensions })] })

  it("reconnaît un refus d'accès ou un élément introuvable", () => {
    expect(isAccessRefusal(refusal({ code: "FORBIDDEN" }))).toBe(true)
    // The API answers a missing flight with a 404 hidden behind a server error code.
    expect(isAccessRefusal(refusal({ code: "INTERNAL_SERVER_ERROR", status: 404 }))).toBe(true)
  })

  it("laisse une panne pour ce qu'elle est", () => {
    expect(isAccessRefusal(refusal({ code: "INTERNAL_SERVER_ERROR" }))).toBe(false)
    expect(isAccessRefusal(new Error("Failed to fetch"))).toBe(false)
  })
})
