import { ApolloError } from "@apollo/client"
import { GraphQLError } from "graphql"
import { apiErrorMessage, apiRefusalMessage } from "../api-error"

const refusal = (message: string, statusCode: number) =>
  new ApolloError({
    graphQLErrors: [new GraphQLError(message, { extensions: { originalError: { statusCode, message } } })],
  })

describe("apiErrorMessage", () => {
  it("gives the reason the API wrote for the member", () => {
    const error = refusal("Le club doit garder au moins un administrateur actif : ce compte est le dernier.", 403)
    expect(apiErrorMessage(error)).toBe(
      "Le club doit garder au moins un administrateur actif : ce compte est le dernier.",
    )
    expect(apiErrorMessage(refusal("Un rôle porte déjà ce nom", 409))).toBe("Un rôle porte déjà ce nom")
  })

  it("gives nothing for a technical failure, so the screen keeps its own text", () => {
    expect(apiErrorMessage(refusal("relation users does not exist", 500))).toBeUndefined()
    expect(apiErrorMessage(new ApolloError({ graphQLErrors: [new GraphQLError("Internal server error")] }))).toBeUndefined()
    expect(apiErrorMessage(new ApolloError({ networkError: new Error("Failed to fetch") }))).toBeUndefined()
    expect(apiErrorMessage(new Error("boom"))).toBeUndefined()
  })
})

describe("apiRefusalMessage", () => {
  it("only gives the message of the expected kind of refusal", () => {
    expect(apiRefusalMessage(refusal("Ce compte est désactivé.", 403), 403)).toBe("Ce compte est désactivé.")
    // A wrong password is answered in English by the API: the screen keeps its own wording.
    expect(apiRefusalMessage(refusal("Invalid credentials", 401), 403)).toBeUndefined()
  })
})
