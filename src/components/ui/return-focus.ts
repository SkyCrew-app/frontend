import { useRef } from "react"

type AutoFocusHandler = ((event: Event) => void) | undefined

/**
 * Gives the focus back, when a dialog or a panel closes, to what had it before it opened.
 *
 * Radix only gives it back to its own trigger. A window opened from code (a free cell of the
 * calendar, a row of a list, a menu item, another panel) has none, and the focus fell back to
 * the top of the page: a keyboard user had to tab through the whole menu again.
 */
export function useReturnFocus({
  onOpenAutoFocus,
  onCloseAutoFocus,
}: {
  onOpenAutoFocus?: AutoFocusHandler
  onCloseAutoFocus?: AutoFocusHandler
}) {
  const previous = useRef<HTMLElement | null>(null)

  return {
    onOpenAutoFocus: (event: Event) => {
      // Called before the window takes the focus: what has it now is what opened the window.
      const active = document.activeElement
      previous.current = active instanceof HTMLElement && active !== document.body ? active : null
      onOpenAutoFocus?.(event)
    },
    onCloseAutoFocus: (event: Event) => {
      onCloseAutoFocus?.(event)
      const target = previous.current
      previous.current = null
      if (event.defaultPrevented || !target?.isConnected) return
      // Leave alone a focus the user has already put elsewhere (a click outside the window).
      const active = document.activeElement
      const container = event.currentTarget instanceof Node ? event.currentTarget : null
      if (active && active !== document.body && !container?.contains(active)) return
      event.preventDefault()
      target.focus({ preventScroll: true })
    },
  }
}
