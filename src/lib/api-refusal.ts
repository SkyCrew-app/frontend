import { ApolloError } from "@apollo/client"

// Messages the server framework writes by itself: they say nothing to a member.
const GENERIC = /^(bad request( exception)?|internal server error|forbidden( resource)?|unauthorized|not found)$/i

/**
 * The message of a refusal by the API, which writes it for the member in the language of the
 * request, or `fallback` for anything else (network failure, unexpected error).
 */
export const apiRefusal = (error: unknown, fallback: string): string => {
  const message = error instanceof ApolloError ? error.graphQLErrors[0]?.message?.trim() : undefined
  return message && !GENERIC.test(message) ? message : fallback
}
