'use client'

import * as React from 'react'

/** How long a step takes, ms. */
export const STEP_MS = 360
/** Its curve: quick to leave, long to settle. */
export const STEP_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
/** The space between the old and the new step on the track, px. */
const GAP = 24
/** A keyframe every 4 ms: finer than any screen's frames, so the steps below read as a glide. */
const KEYFRAMES = Math.round(STEP_MS / 4)

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** STEP_EASE as progress over time, 0 to 1. */
function ease(t: number) {
  const [x1, y1, x2, y2] = [0.22, 1, 0.36, 1]
  const at = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (at(x1, x2, mid) < t) lo = mid
    else hi = mid
  }
  return at(y1, y2, (lo + hi) / 2)
}

/**
 * Keyframes from `from` to `to` along the curve, every value on the screen's pixel grid (half a
 * CSS pixel on a 2x screen) and each held until the next (`steps`): whichever moment the browser
 * draws, a part sits on whole device pixels, so its icons and text are never resampled between
 * them. The ends are exactly where layout puts things, so nothing snaps when a step starts or
 * ends, and a box whose height ends on a half pixel gets there without a last half-pixel hop.
 */
function wholePixels(from: number, to: number, css: (v: number) => Keyframe): Keyframe[] {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
  const grid = (v: number) => Math.round(v * dpr) / dpr
  return Array.from({ length: KEYFRAMES + 1 }, (_, i) => {
    const t = i / KEYFRAMES
    const v = i === 0 ? from : i === KEYFRAMES ? to : grid(from + (to - from) * ease(t))
    return { ...css(v), offset: t, easing: 'steps(1, end)' }
  })
}
const across = (x: number): Keyframe => ({ transform: `translate3d(${x}px, 0, 0)` })
const tall = (h: number): Keyframe => ({ height: `${h}px` })

/** A part held at its size while it moves, so the box easing around it never lays it out again. */
const LOCKS = ['width', 'height', 'min-height', 'max-height', 'flex', 'contain'] as const
function lock(el: HTMLElement, width: number, height: number) {
  const before = LOCKS.map((p) => el.style.getPropertyValue(p))
  el.style.setProperty('width', `${width}px`)
  el.style.setProperty('height', `${height}px`)
  el.style.setProperty('min-height', `${height}px`)
  el.style.setProperty('max-height', `${height}px`)
  el.style.setProperty('flex', 'none')
  el.style.setProperty('contain', 'layout paint')
  return () => LOCKS.forEach((p, i) => (before[i] ? el.style.setProperty(p, before[i]) : el.style.removeProperty(p)))
}

type Snapshot = { heights: number[]; copies: (Node | null)[]; scrolls: number[] }

/** The slide running in each box: where its part started, and how to let it go. */
const running = new WeakMap<Element, { slide: Animation; from: number; unlock: () => void }>()

/**
 * The step slide: how DecisionCard moves between its questions, and Satin Pro's CommandPages
 * between its pages. One horizontal track: a copy of how each part looked and the part itself
 * sit side by side, 24px apart, and move a frame's width plus 24px to the side together (the new
 * one in from the end side going forward, from the start side going back), the copy fading out
 * and the part fading in, while the part's box (its parent) eases from the old height to the new
 * one and clips them. All of it 360 ms on cubic-bezier(0.22, 1, 0.36, 1). Stepping again
 * mid-slide carries on from where things are, even when the part is a new element. A part that
 * reads the same on both steps stays still. Under reduced motion nothing moves.
 *
 * Nothing in the parts is laid out or painted again while they move: both are held at the size
 * they were measured at (and contained) while only the box's height changes around them, and the
 * track and the height advance in whole pixels from and to exact layout values (see wholePixels).
 *
 * `key` names the step; `order` puts steps in order (higher is forward); `frameRef` is what the
 * track is as wide as (the card, the menu); `parts` returns the elements that move, each the only
 * child of a positioned box that nothing else sizes. Call it on every render: it keeps a copy of
 * each part as it was. When a part changes without this component rendering (a list that keeps
 * its own highlight and scroll), call the returned `capture()` just before the step, so the copy
 * is taken as the part looks then.
 */
/** @internal Shared by Satin's own components; not part of the public API and may change in any release. */
export function useStepSlide(key: string, order: number, frameRef: React.RefObject<HTMLElement | null>, parts: () => (HTMLElement | null)[]) {
  const partsRef = React.useRef(parts)
  partsRef.current = parts
  const last = React.useRef<({ key: string; order: number } & Snapshot) | null>(null)
  const captured = React.useRef<Snapshot | null>(null)

  const record = React.useCallback((): Snapshot => {
    const now = partsRef.current()
    return {
      // Each part's own height, unrounded (offsetHeight rounds, and the half pixel then snaps).
      heights: now.map((p) => p?.getBoundingClientRect().height ?? 0),
      copies: now.map((p) => p?.cloneNode(true) ?? null),
      scrolls: now.map((p) => p?.scrollTop ?? 0),
    }
  }, [])

  React.useLayoutEffect(() => {
    const frame = frameRef.current
    const prev = last.current && { ...last.current, ...captured.current }
    captured.current = null

    if (frame && prev && prev.key !== key && !reducedMotion()) {
      // The next step comes in from the end side: the right, or the left in right-to-left.
      const sign = (order < prev.order ? -1 : 1) * (getComputedStyle(frame).direction === 'rtl' ? -1 : 1)
      const distance = frame.clientWidth + GAP
      const fade: KeyframeAnimationOptions = { duration: STEP_MS, easing: STEP_EASE }
      const steps: KeyframeAnimationOptions = { duration: STEP_MS }
      partsRef.current().forEach((el, i) => {
        const host = el?.parentElement
        const copy = prev.copies[i] as HTMLElement | null
        if (!el || !host || typeof el.animate !== 'function') return
        // The same on both steps (a title every step shares): it stays still.
        if (copy?.isEqualNode(el)) return
        // Stepping again mid-slide: everything goes on from where it is now, not from rest. The
        // part may be a new element (another page's content): then the box's running slide says
        // how far the old one had come.
        const ongoing = running.get(host)
        let startX = 0
        let startOpacity = 1
        if (ongoing?.slide.playState === 'running') {
          const p = ongoing.slide.effect?.getComputedTiming().progress ?? 1
          startX = ongoing.from * (1 - ease(p))
          startOpacity = ease(p)
        }
        const fromHeight = host.getAnimations().length > 0 ? host.getBoundingClientRect().height : prev.heights[i]
        for (const n of [el, host]) n.getAnimations().forEach((a) => a.cancel())
        ongoing?.slide.cancel()
        ongoing?.unlock()
        host.querySelectorAll(':scope > [data-step-copy]').forEach((n) => n.remove())
        const box = el.getBoundingClientRect()
        const toHeight = box.height

        host.style.overflow = 'clip'
        const unlock = lock(el, box.width, box.height)
        const slide = el.animate(wholePixels(sign * distance, 0, across), steps)
        el.animate([{ opacity: 0 }, { opacity: 1 }], fade)
        running.set(host, { slide, from: sign * distance, unlock })
        if (Math.abs(fromHeight - toHeight) > 0.25) host.animate(wholePixels(fromHeight, toHeight, tall), steps)
        if (copy) {
          copy.setAttribute('data-step-copy', '')
          copy.setAttribute('aria-hidden', 'true')
          copy.setAttribute('inert', '')
          copy.removeAttribute('id')
          copy.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'))
          // Held at the size it was, so it never lays out again while it leaves.
          copy.style.cssText += `;position:absolute;top:0;left:0;width:${box.width}px;height:${prev.heights[i]}px;max-height:none;min-height:0;contain:layout paint;pointer-events:none`
          host.appendChild(copy)
          // A scrolled list leaves as it was scrolled.
          const scroll = prev.scrolls[i] ?? 0
          if (scroll > 0) copy.scrollTop = scroll
          copy.animate(wholePixels(startX, -sign * distance, across), steps)
          copy.animate([{ opacity: startOpacity }, { opacity: 0 }], fade)
        }
        // Done: the copy goes, the part is let go and the box stops clipping, all on the same
        // frame, at exactly the sizes layout gives them. Cut short by another step: that one takes over.
        slide.finished.then(
          () => {
            if (running.get(host)?.slide !== slide) return
            running.delete(host)
            copy?.remove()
            unlock()
            host.style.overflow = ''
          },
          () => {},
        )
      })
    }

    last.current = { key, order, ...record() }
  })

  /** Takes the copy of each part now, for the next step; call it just before the step. */
  return React.useCallback(() => {
    captured.current = record()
  }, [record])
}
