'use client'

import * as React from 'react'

/**
 * The background (or underline) that slides under the selected item of Tabs, Segmented control
 * and Pagination, all on one motion: 300 ms on a gentle ease-out, the leading edge (the one on
 * the side it is heading to) moving straight away and the trailing edge 30 ms behind, so it
 * stretches a little towards the new item and settles there. The curve starts softer than the
 * kit's --ease-out (slope about 2.3 rather than 4.3): on that one the pill covered half the way
 * in two frames and then crept, which read as a snap. A change mid-move carries on from
 * wherever it is. Only a change of selection animates; a resize just puts it in place. With
 * reduced motion it moves at once.
 *
 * `listRef` is the positioned element the items sit in, `selector` finds the selected item in
 * it, `selected` is whatever names the selection. Render the indicator absolutely at left 0 of
 * the list with the returned `ref`; until it is placed (`ready`), let the selected item paint
 * its own fill so the server render isn't bare.
 */
export const SLIDE_MS = 300
const TRAIL_MS = 30
const STEPS = 24

/** cubic-bezier(0.32, 0.72, 0, 1), as a function of time 0..1. */
function easeOut(t: number) {
  const [x1, y1, x2, y2] = [0.32, 0.72, 0, 1]
  const bez = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s ** 2 * (1 - s) + s ** 3
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (bez(x1, x2, mid) < t) lo = mid
    else hi = mid
  }
  return bez(y1, y2, (lo + hi) / 2)
}

/** Whether the target, or anything between it and the list, is moved or scaled by a transform. */
function movedWithin(target: HTMLElement, list: HTMLElement) {
  for (let n: HTMLElement | null = target; n && n !== list; n = n.parentElement) {
    const cs = getComputedStyle(n)
    if (cs.transform !== 'none' || cs.translate !== 'none' || cs.scale !== 'none' || cs.rotate !== 'none') return true
  }
  return false
}

export function useSlidingIndicator<T extends HTMLElement = HTMLSpanElement>(
  listRef: React.RefObject<HTMLElement | null>,
  selector: string,
  selected: unknown,
  /** Off: it moves to the new item at once. */
  { animate: motionOn = true }: { animate?: boolean } = {},
) {
  const ref = React.useRef<T>(null)
  const [ready, setReady] = React.useState(false)
  const placed = React.useRef(false)

  const place = React.useCallback(
    (animate: boolean) => {
      const list = listRef.current
      const el = ref.current
      if (!list || !el) return
      const target = list.querySelector<HTMLElement>(selector)
      if (!target) {
        el.style.opacity = '0'
        return
      }
      // The target's edges from the list's padding edge (the indicator's left 0), measured
      // unrounded and put on the nearest device pixel. offsetLeft and offsetWidth round to whole
      // CSS pixels, which left the pill up to a device pixel off the item at 2x; unrounded, its
      // resting edges fell between device pixels and changed when the animation handed over.
      const listBox = list.getBoundingClientRect()
      const origin = listBox.left + list.clientLeft
      const rect = target.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      let x = Math.round((rect.left - origin) * dpr) / dpr
      let w = Math.round((rect.right - origin) * dpr) / dpr - x
      // Rects count transforms: while the list is scaled (a dialog zooming in) or the target is
      // moved inside it (Pagination's strip sliding), its place comes from layout instead.
      if (Math.abs(listBox.width - list.offsetWidth) > 0.5 || movedWithin(target, list)) {
        x = target.offsetLeft
        for (let p = target.offsetParent as HTMLElement | null; p && p !== list; p = p.offsetParent as HTMLElement | null) x += p.offsetLeft
        w = target.offsetWidth
      }
      // Where the indicator is on screen right now, mid-move included.
      const box = el.getBoundingClientRect()
      const from = { x: box.left - origin, w: box.width }
      el.getAnimations().forEach((a) => a.cancel())
      el.style.opacity = '1'
      el.style.width = `${w}px`
      el.style.transform = `translateX(${x}px)`

      const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (!animate || !motionOn || !placed.current || reduced || (Math.abs(from.x - x) < 0.5 && Math.abs(from.w - w) < 0.5)) {
        placed.current = true
        return
      }
      // Two edges on their own clocks: the one leading the way goes first.
      const right = x > from.x
      const L0 = from.x
      const R0 = from.x + from.w
      const L1 = x
      const R1 = x + w
      const lead = (t: number) => easeOut(t)
      const trail = (t: number) => easeOut(Math.max(0, (t * SLIDE_MS - TRAIL_MS) / (SLIDE_MS - TRAIL_MS)))
      const frames: Keyframe[] = []
      for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS
        const pl = right ? trail(t) : lead(t)
        const pr = right ? lead(t) : trail(t)
        const l = L0 + (L1 - L0) * pl
        const r = R0 + (R1 - R0) * pr
        frames.push({ offset: t, transform: `translateX(${l}px)`, width: `${Math.max(r - l, 0)}px` })
      }
      el.animate(frames, { duration: SLIDE_MS, easing: 'linear' })
    },
    [listRef, selector, motionOn],
  )

  React.useLayoutEffect(() => {
    place(true)
    setReady(true)
  }, [place, selected])

  React.useEffect(() => {
    const list = listRef.current
    if (!list) return
    const observer = new ResizeObserver(() => place(false))
    observer.observe(list)
    return () => observer.disconnect()
  }, [listRef, place])

  return { ref, ready }
}
