'use client'

import * as React from 'react'
import { curve, easeSize, freeze, measure, pixelKeyframes } from './pixel-motion'

/** How long a step takes, ms. */
export const STEP_MS = 360
/** Its curve: quick to leave, long to settle. */
export const STEP_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
/** STEP_EASE as progress over time, 0 to 1. */
const STEP = curve(0.22, 1, 0.36, 1)
/** The space between the old and the new step on the track, px. */
const GAP = 24

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** The track from `from` to `to` in whole device pixels, from and to exact values (see pixelKeyframes). */
const across = (from: number, to: number) =>
  pixelKeyframes(from, to, (x) => ({ transform: `translate3d(${x}px, 0, 0)` }), { ease: STEP, duration: STEP_MS })

type Snapshot = { heights: number[]; copies: (Node | null)[]; scrolls: number[] }

/** The slide running in each box: where its part started, and how to let it go. */
const running = new WeakMap<Element, { slide: Animation; from: number; release: () => void }>()

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
 * track and the height advance in whole device pixels from and to exact layout values (see
 * pixelKeyframes in pixel-motion.tsx).
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
      // Each part's own height from layout, unrounded and unscaled (see measure): offsetHeight
      // rounds, and a rect counts a dialog's zoom, so the end would snap.
      heights: now.map((p) => (p ? measure(p).height : 0)),
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
          startX = ongoing.from * (1 - STEP(p))
          startOpacity = STEP(p)
        }
        const fromHeight = host.getAnimations().length > 0 ? measure(host).height : prev.heights[i]
        for (const n of [el, host]) n.getAnimations().forEach((a) => a.cancel())
        ongoing?.slide.cancel()
        ongoing?.release()
        host.querySelectorAll(':scope > [data-step-copy]').forEach((n) => n.remove())
        const box = measure(el)
        const toHeight = box.height

        host.style.overflow = 'clip'
        const release = freeze(el, box.width, box.height)
        const slide = el.animate(across(sign * distance, 0), steps)
        el.animate([{ opacity: 0 }, { opacity: 1 }], fade)
        running.set(host, { slide, from: sign * distance, release })
        // The box's earlier run was cancelled above, so easeSize starts from fromHeight. The box
        // clips for the whole slide (above, let go below), so easeSize leaves its overflow alone.
        if (Math.abs(fromHeight - toHeight) > 0.25) easeSize(host, { from: fromHeight, to: toHeight, duration: STEP_MS, ease: STEP, clip: false })
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
          copy.animate(across(startX, -sign * distance), steps)
          copy.animate([{ opacity: startOpacity }, { opacity: 0 }], fade)
        }
        // Done: the copy goes, the part is let go and the box stops clipping, all on the same
        // frame, at exactly the sizes layout gives them. Cut short by another step: that one takes over.
        slide.finished.then(
          () => {
            if (running.get(host)?.slide !== slide) return
            running.delete(host)
            copy?.remove()
            release()
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
