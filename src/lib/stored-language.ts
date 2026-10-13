import { print } from "graphql"

import { GET_MY_LANGUAGE, UPDATE_MY_LANGUAGE } from "@/graphql/user"
import { currentLanguage, type Language } from "@/lib/i18n"
import { getGraphqlUrl } from "@/lib/runtime-config"

// The interface language lives in the browser. The server keeps a copy of it
// to write to the member when they are not there (e-mails, notifications).
// Keeping that copy up to date is silent: it never blocks or fails the page.

const request = async (
  document: Parameters<typeof print>[0],
  variables: Record<string, unknown>,
  language: Language,
): Promise<Record<string, unknown> | null> => {
  if (typeof fetch !== "function") return null
  try {
    const response = await fetch(getGraphqlUrl(), {
      method: "POST",
      credentials: "include",
      // The language switcher reloads the page right after: the request must outlive it.
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        "Apollo-Require-Preflight": "true",
        "Accept-Language": language,
      },
      body: JSON.stringify({ query: print(document), variables }),
    })
    if (!response.ok) return null
    const body = await response.json()
    return body?.data ?? null
  } catch {
    // Offline, signed out, API unreachable: the next sign-in tries again.
    return null
  }
}

/** Stores the language on the server for the signed-in member. Says whether it was stored. */
export const saveLanguage = async (language: Language): Promise<boolean> => {
  const data = await request(UPDATE_MY_LANGUAGE, { language }, language)
  return Boolean(data?.updateMyLanguage)
}

/** Aligns the stored language with the one of the interface when they differ. */
export const syncStoredLanguage = async (): Promise<void> => {
  const language = currentLanguage()
  const data = await request(GET_MY_LANGUAGE, {}, language)
  const me = data?.me as { language?: string | null } | null | undefined
  // No session: nothing to align.
  if (!me || me.language === language) return
  await saveLanguage(language)
}
