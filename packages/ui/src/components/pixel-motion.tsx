'use client'

/*
 * Motion on the screen's pixel grid, for things that move or resize by layout values: a box
 * easing to its new height, a track sliding a frame's width. Animated in CSS, a length lands
 * between device pixels on most frames, so icons and text are resampled on the way, and a box
 * eased between rounded sizes snaps to its real one at the end. Here every value is held on the
 * device-pixel grid, counted from where it ends, and both ends are the exact layout values:
 * whichever frame the browser draws, things sit on whole device pixels, and nothing moves when
 * the animation hands back to layout. The step slide (step-slide.tsx) is built on it.
 */

/** A keyframe every 4 ms: finer than any screen's frames, so the held values read as a glide. */
const EVERY_MS = 4

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * `cubic-bezier(x1, y1, x2, y2)` as a function: progress (0 to 1) at time `t` (0 to 1).
 * @internal Shared by Satin's own components; not part of the public API and may change in any release.
 */
export function curve(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const at = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3
  return (t) => {
    let lo = 0
    let hi = 1
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (at(x1, x2, mid) < t) lo = mid
      else hi = mid
    }
    return at(y1, y2, (lo + hi) / 2)
  }
}

/**
 * An element's size as drawn, unrounded: offsetWidth and offsetHeight round, and an animation
 * that starts or ends on the rounded value hops the half pixel back when layout takes over.
 * @internal Shared by Satin's own components; not part of the public API and may change in any release.
 */
export function measure(el: Element): { width: number; height: number } {
  const { width, height } = el.getBoundingClientRect()
  return { width, height }
}

/**
 * Keyframes from `from` to `to` along `ease`, one every 4 ms, each held until the next
 * (`steps(1, end)`), so whichever moment the browser draws, the value sits on the screen's pixel
 * grid (half a CSS pixel on a 2x screen). The grid is counted from `to`: Satin's 0.75px edges put
 * rest sizes on quarter pixels, and a grid counted from zero would leave a half-device-pixel hop
 * onto them at the end. The first keyframe is exactly `from` and the last exactly `to`.
 * `css` turns a value into the keyframe's properties.
 * @internal Shared by Satin's own components; not part of the public API and may change in any release.
 */
export function pixelKeyframes(
  from: number,
  to: number,
  css: (value: number) => Keyframe,
  { ease, duration }: { ease: (t: number) => number; duration: number },
): Keyframe[] {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
  const count = Math.max(1, Math.round(duration / EVERY_MS))
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count
    const value = i === 0 ? from : i === count ? to : to + Math.round((from - to) * (1 - ease(t)) * dpr) / dpr
    return { ...css(value), offset: t, easing: 'steps(1, end)' }
  })
}

/** What freeze sets inline, and puts back. */
const FROZEN = ['width', 'height', 'min-height', 'max-height', 'flex', 'contain'] as const

/**
 * Holds an element at `width` × `height` (and contains its layout and paint) while something
 * around it moves or resizes, so it is never laid out or painted again on the way. Returns the
 * release, which puts back the inline values it had; calling it again does nothing.
 * @internal Shared by Satin's own components; not part of the public API and may change in any release.
 */
export function freeze(el: HTMLElement, width: number, height: number): () => void {
  const before = FROZEN.map((p) => el.style.getPropertyValue(p))
  el.style.setProperty('width', `${width}px`)
  el.style.setProperty('height', `${height}px`)
  el.style.setProperty('min-height', `${height}px`)
  el.style.setProperty('max-height', `${height}px`)
  el.style.setProperty('flex', 'none')
  el.style.setProperty('contain', 'layout paint')
  let released = false
  return () => {
    if (released) return
    released = true
    FROZEN.forEach((p, i) => (before[i] ? el.style.setProperty(p, before[i]) : el.style.removeProperty(p)))
  }
}

export interface EaseSizeOptions {
  /** Where it starts, px; a box still easing from an earlier call starts from where it is instead. */
  from: number
  /** Where it ends, px: the size layout gives the box afterwards, unrounded (see measure). */
  to: number
  /** @default 'height' */
  axis?: 'height' | 'width'
  /** ms */
  duration: number
  /** Progress over time, e.g. curve(0.22, 1, 0.36, 1). */
  ease: (t: number) => number
  /** Content to hold at its measured size while the box eases around it (see freeze). */
  freeze?: HTMLElement
}

/** The easeSize running on each box, and what it holds. */
const runs = new WeakMap<HTMLElement, { animation: Animation; release?: () => void }>()

/**
 * Eases a box's height (or width) from `from` to `to` on the pixel grid (see pixelKeyframes),
 * clipping what it holds and, with `freeze`, holding that content at its size. When it ends, the
 * freeze is let go and the clip removed on the same frame, the box back at its layout size. A
 * new call on the same box cancels the running one and starts from the size the box has
 * reached. Returns the animation, or null under reduced motion (the box just takes its size).
 * Cancelled any other way, the box keeps its clip until the next call.
 * @internal Shared by Satin's own components; not part of the public API and may change in any release.
 */
export function easeSize(box: HTMLElement, { from, to, axis = 'height', duration, ease, freeze: content }: EaseSizeOptions): Animation | null {
  const old = runs.get(box)
  let start = from
  if (old) {
    // Mid-way: carry on from the size it has reached, measured before the old run lets it go.
    if (old.animation.playState !== 'idle') start = measure(box)[axis]
    old.animation.cancel()
    old.release?.()
    runs.delete(box)
  }
  if (reducedMotion() || typeof box.animate !== 'function') {
    if (old) box.style.removeProperty('overflow')
    return null
  }

  box.style.setProperty('overflow', 'clip')
  let release: (() => void) | undefined
  if (content) {
    const size = measure(content)
    release = freeze(content, size.width, size.height)
  }
  const css = axis === 'width' ? (v: number): Keyframe => ({ width: `${v}px` }) : (v: number): Keyframe => ({ height: `${v}px` })
  const animation = box.animate(pixelKeyframes(start, to, css, { ease, duration }), { duration })
  const run = { animation, release }
  runs.set(box, run)
  animation.finished.then(
    () => {
      if (runs.get(box) !== run) return
      runs.delete(box)
      release?.()
      box.style.removeProperty('overflow')
    },
    () => {},
  )
  return animation
}
