import { useEffect, useState } from "react"

// False on the server and during the first render in the browser, true
// afterwards. Lets a component show the same thing as the server first, then
// what only the browser knows, such as data restored from its cache.
export function useMounted() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return mounted
}
