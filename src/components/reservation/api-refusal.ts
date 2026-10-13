import { ApolloError } from "@apollo/client"

// Business refusals of the API (slot taken, licence, balance, too late to cancel…) are
// written for the member, in the language of the interface: they are shown as they are.
// A technical failure keeps the wording of the screen.
export const apiRefusalMessage = (error: unknown, fallback: string) => {
  const refusal = error instanceof ApolloError ? error.graphQLErrors[0] : undefined
  if (!refusal?.message || refusal.extensions?.code === "INTERNAL_SERVER_ERROR") return fallback
  return refusal.message
}
