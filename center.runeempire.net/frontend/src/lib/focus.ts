import type { MouseEvent } from 'react'

/**
 * Lets go of the focus a mouse click leaves on a link or button. Otherwise the
 * next key press (scrolling with the arrows, say) switches the browser to
 * keyboard mode and the clicked item shows its focus ring. A click made from
 * the keyboard has detail 0 and keeps its focus.
 */
export function blurAfterPointerClick(event: MouseEvent<HTMLElement>) {
  if (event.detail > 0) {
    event.currentTarget.blur()
  }
}
