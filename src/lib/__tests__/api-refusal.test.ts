import { ApolloError } from "@apollo/client"
import { GraphQLError } from "graphql"
import { apiRefusal } from "../api-refusal"

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
