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
 * An element's layout size, unrounded and transform-free: its computed width and height (the
 * border box, under Satin's preflight), mid-animation the animated value. Not offsetWidth and
 * offsetHeight, which round, so an animation that starts or ends on them hops the half pixel back
 * when layout takes over; not a rect, which counts the scale of anything around it (a dialog
 * zooming in), so the end is wrong by the scale and snaps. Where computed style gives no length
 * (an inline box, jsdom), the rect.
 * @internal Shared by Satin's own components; not part of the public API and may change in any release.
 */
export function measure(el: Element): { width: number; height: number } {
  const cs = getComputedStyle(el)
  const length = (v: string) => (v.endsWith('px') ? parseFloat(v) : NaN)
  const width = length(cs.width)
  const height = length(cs.height)
  if (Number.isFinite(width) && Number.isFinite(height)) return { width, height }
  const rect = el.getBoundingClientRect()
  return { width: rect.width, height: rect.height }
}

/**
 * Keyframes from `from` to `to` along `ease`, one every 4 ms, each held until the next
 * (`steps(1, end)`), so whichever moment the browser draws, the value sits on the screen's pixel
 * grid (half a CSS pixel on a 2x screen). The grid is counted from `to`: fractional line heights
 * and borders leave rest sizes between device pixels, and a grid counted from zero would leave a
 * last hop of up to half a device pixel onto them. The first keyframe is exactly `from` and the
 * last exactly `to`.
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
  /** Where it ends, px: the size layout gives the box afterwards (see measure). */
  to: number
  /** @default 'height' */
  axis?: 'height' | 'width'
  /** ms */
  duration: number
  /** Progress over time, e.g. curve(0.22, 1, 0.36, 1). */
  ease: (t: number) => number
  /** Content to hold at its measured size while the box eases around it (see freeze). */
  freeze?: HTMLElement
  /**
   * Clips the box while it eases and puts its own overflow back after. Off when the caller clips
   * the box itself for longer than the size eases (the step slide clips its track).
   * @default true
   */
  clip?: boolean
}

/** The box's inline overflow a run replaces with its clip, and puts back. */
const OVERFLOW = ['overflow-x', 'overflow-y'] as const

/** The easeSize running on each box: its animation, the content's release, the box's own overflow. */
type Run = { animation: Animation; release?: () => void; overflow?: string[] }
const runs = new WeakMap<HTMLElement, Run>()

/** Lets go of what a run holds: the content's freeze, and the clip, back to the box's own overflow. */
function letGo(box: HTMLElement, run: Run) {
  run.release?.()
  run.overflow?.forEach((v, i) => (v ? box.style.setProperty(OVERFLOW[i], v) : box.style.removeProperty(OVERFLOW[i])))
}

/**
 * Eases a box's height (or width) from `from` to `to` on the pixel grid (see pixelKeyframes),
 * clipping what it holds and, only with `freeze`, holding that content at its size; without it
 * the content is laid out again at each step. When the animation ends, or anything else cancels
 * it, the freeze is let go and the box's own overflow put back before the next frame, the box at
 * its layout size. A new call on the same box cancels the running one and starts from the size
 * the box has reached. Returns the animation, or null under reduced motion (the box just takes
 * its size).
 * @internal Shared by Satin's own components; not part of the public API and may change in any release.
 */
export function easeSize(
  box: HTMLElement,
  { from, to, axis = 'height', duration, ease, freeze: content, clip = true }: EaseSizeOptions,
): Animation | null {
  const old = runs.get(box)
  let start = from
  if (old) {
    // Mid-way: carry on from the size it has reached, measured before the old run lets it go.
    if (old.animation.playState !== 'idle') start = measure(box)[axis]
    // Out of the map first, so the old run's own ending leaves the box to this one.
    runs.delete(box)
    old.animation.cancel()
    letGo(box, old)
  }
  if (reducedMotion() || typeof box.animate !== 'function') return null

  const overflow = clip ? OVERFLOW.map((p) => box.style.getPropertyValue(p)) : undefined
  if (clip) box.style.setProperty('overflow', 'clip')
  let release: (() => void) | undefined
  if (content) {
    const size = measure(content)
    release = freeze(content, size.width, size.height)
  }
  const css = axis === 'width' ? (v: number): Keyframe => ({ width: `${v}px` }) : (v: number): Keyframe => ({ height: `${v}px` })
  const animation = box.animate(pixelKeyframes(start, to, css, { ease, duration }), { duration })
  const run: Run = { animation, release, overflow }
  runs.set(box, run)
  // Finished, or cancelled by anyone (then `finished` rejects, in a microtask): while it is still
  // the box's run, let go of what it holds.
  const end = () => {
    if (runs.get(box) !== run) return
    runs.delete(box)
    letGo(box, run)
  }
  animation.finished.then(end, end)
  return animation
}
