"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@apollo/client"
import { LOGOUT_MUTATION } from "@/graphql/system"
import { clearSessionCache } from "@/lib/apollo-client"

// Ends the session on the server, forgets what was cached for it, then goes
// back to the sign-in page. Shared by every sign-out control.
export function useLogout() {
  const router = useRouter()
  const [logout] = useMutation(LOGOUT_MUTATION)

  return useCallback(async () => {
    try {
      await logout()
      await clearSessionCache()
      router.push("/")
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error)
    }
  }, [logout, router])
}
