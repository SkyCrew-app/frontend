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

/**
 * True when the API refused to show something because it does not exist or is not the
 * member's (403/404), as opposed to a network or server failure: the screen then says
 * "not found or not yours" instead of "check your connection and retry".
 */
export const isAccessRefusal = (error: unknown): boolean => {
  if (!(error instanceof ApolloError)) return false
  return error.graphQLErrors.some((refusal) => {
    const extensions = (refusal.extensions ?? {}) as {
      code?: string
      status?: number
      originalError?: { statusCode?: number }
    }
    const status = extensions.status ?? extensions.originalError?.statusCode
    return extensions.code === "FORBIDDEN" || extensions.code === "NOT_FOUND" || status === 403 || status === 404
  })
}
