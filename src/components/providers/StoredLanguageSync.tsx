"use client"

import { useEffect } from "react"

import { syncStoredLanguage } from "@/lib/stored-language"

// Once the signed-in area opens: the language the server writes to the member
// in follows the one of the interface. Shows nothing and never fails the page.
export default function StoredLanguageSync() {
  useEffect(() => {
    void syncStoredLanguage()
  }, [])

  return null
}
