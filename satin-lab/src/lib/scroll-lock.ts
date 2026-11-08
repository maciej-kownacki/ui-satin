import * as React from 'react'

/** While `active`, the page behind a drawer doesn't scroll. */
export function useScrollLock(active: boolean) {
  React.useEffect(() => {
    if (!active) return
    const html = document.documentElement
    const prev = { overflow: html.style.overflow, overscroll: html.style.overscrollBehavior }
    html.style.overflow = 'hidden'
    html.style.overscrollBehavior = 'none'
    return () => {
      html.style.overflow = prev.overflow
      html.style.overscrollBehavior = prev.overscroll
    }
  }, [active])
}
