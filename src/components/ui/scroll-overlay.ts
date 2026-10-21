// Dialogs and side panels scroll with their dimmed backdrop, like a page: a tall window
// moves as one instead of scrolling inside a box of fixed height.

/** Marks the backdrop that scrolls; see `keepOpenOnScrollbar`. */
export const SCROLL_OVERLAY = { "data-scroll-overlay": "" }

type OutsideEvent = CustomEvent<{ originalEvent: PointerEvent }>

/**
 * A press on the backdrop's own scroll bar is not a click outside the window: it stays open.
 * Wraps the caller's own handler, which still runs.
 */
export const keepOpenOnScrollbar =
  <E extends OutsideEvent>(handler?: (event: E) => void) =>
  (event: E) => {
    const { originalEvent } = event.detail
    const target = originalEvent.target
    if (
      target instanceof HTMLElement &&
      target.hasAttribute("data-scroll-overlay") &&
      originalEvent.clientX >= target.getBoundingClientRect().left + target.clientWidth
    ) {
      event.preventDefault()
    }
    handler?.(event)
  }
