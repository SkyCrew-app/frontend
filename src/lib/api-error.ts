import { ApolloError } from "@apollo/client"

/**
 * The reason the API gave for refusing a request, written for the member in
 * their language (e.g. "this account is the last administrator"). Undefined
 * for a network failure or a technical error: the caller then shows its own text.
 */
const statusOf = (extensions: Record<string, unknown> | undefined): number | undefined => {
  const status = (extensions?.originalError as { statusCode?: unknown } | undefined)?.statusCode
  return typeof status === "number" ? status : undefined
}

export const apiErrorMessage = (error: unknown): string | undefined => {
  if (!(error instanceof ApolloError)) return undefined
  const refusal = error.graphQLErrors.find((graphQLError) => {
    const status = statusOf(graphQLError.extensions)
    return status !== undefined && status >= 400 && status < 500
  })
  return refusal?.message || undefined
}

/** Same, for a refusal with this HTTP status only (403: the request is understood but not allowed). */
export const apiRefusalMessage = (error: unknown, status: number): string | undefined => {
  if (!(error instanceof ApolloError)) return undefined
  return error.graphQLErrors.find((graphQLError) => statusOf(graphQLError.extensions) === status)?.message || undefined
}
