'use client'

import * as React from 'react'
import { cn } from '../lib/utils'

/**
 * Streaming text: an agent's answer writing itself out as it arrives, in the assistant
 * Message's type (text/default 13/20).
 *
 * Give it the text received so far and keep it growing; `streaming` while more is coming. A
 * model sends text in uneven chunks, so the component doesn't print them as they land: it
 * writes at an even pace (`speed`, letters a second), stops briefly after a full stop or a
 * comma, and speeds up when it falls behind, so a backlog never takes more than about a second
 * to catch up. A caret (2px, action/primary/bg) sits at the end while it writes.
 *
 * `reveal` is how each piece comes in: `blur` (default) fades every letter in from a 2px blur
 * over 220 ms, `fade` without the blur, `word` a word at a time, `none` prints letters as they
 * come with no motion. Only the letters arriving animate; the rest carry no filter.
 *
 * The whole text received is in the DOM from the start (letters not yet written are only
 * transparent), so screen readers get it at once; the box is aria-busy while it streams.
 * With reduced motion it shows everything received straight away.
 */
export interface StreamingTextProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Everything received so far. Grow it as chunks arrive. */
  text: string
  /** More is coming: keeps the caret and the pace going. */
  streaming?: boolean
  /** Letters written a second at the even pace. */
  speed?: number
  reveal?: 'blur' | 'fade' | 'word' | 'none'
  /** The caret at the end while it writes. */
  caret?: boolean
  /** Called once everything received is written and `streaming` is off. */
  onDone?: () => void
}

/** Extra pause after these, ms, at the even pace. */
const PAUSE: Record<string, number> = { '.': 140, '!': 140, '?': 140, ',': 50, ';': 50, ':': 50, '\n': 90 }
/** A backlog is cleared within about this long, s. */
const CATCH_UP_S = 0.9
/** The caret sits after the last letter lit at least this long ago, ms: one already readable,
 *  not one still coming in from transparent, so it never runs ahead of the visible text. */
const CARET_LAG = 90

/** Letters, or words with the space after them, each one unit to light. */
function split(text: string, byWord: boolean) {
  return byWord ? (text.match(/\S+\s*|\s+/g) ?? []) : Array.from(text)
}

export function StreamingText({
  text,
  streaming = false,
  speed = 80,
  reveal = 'blur',
  caret = true,
  onDone,
  className,
  ...props
}: StreamingTextProps) {
  const units = React.useMemo(() => split(text, reveal === 'word'), [text, reveal])
  const box = React.useRef<HTMLDivElement>(null)
  const shown = React.useRef(0)
  const caretEl = React.useRef<HTMLSpanElement | null>(null)
  const done = React.useRef(onDone)
  done.current = onDone
  const finished = React.useRef(false)

  // Start over when the text is replaced rather than extended (a new answer).
  const prevText = React.useRef(text)
  if (!text.startsWith(prevText.current)) {
    shown.current = 0
    finished.current = false
  }
  prevText.current = text

  React.useEffect(() => {
    const el = box.current
    if (!el) return
    const spans = [...el.querySelectorAll<HTMLElement>('.satin-stream-unit')]
    // Spans re-rendered from scratch (a reset) lose their lit state: put it back up to `shown`.
    for (let i = 0; i < spans.length; i++) {
      if (i < shown.current) spans[i].setAttribute('data-on', '')
      else spans[i].removeAttribute('data-on')
    }

    let mark = caretEl.current
    if (!mark) {
      mark = document.createElement('span')
      mark.className = 'satin-stream-caret'
      mark.setAttribute('aria-hidden', 'true')
      caretEl.current = mark
    }
    const litAt: number[] = []
    const placeCaret = (now = Infinity) => {
      if (!caret || (!streaming && shown.current >= spans.length)) return mark!.remove()
      let i = shown.current - 1
      if (reveal !== 'none') while (i >= 0 && litAt[i] !== undefined && now - litAt[i] < CARET_LAG) i--
      const last = spans[i]
      if (last) {
        if (last.nextSibling !== mark) last.after(mark!)
      } else el.prepend(mark!)
    }
    const finish = () => {
      placeCaret()
      if (!streaming && shown.current >= spans.length && !finished.current) {
        finished.current = true
        done.current?.()
      }
    }

    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      spans.forEach((s) => s.setAttribute('data-on', ''))
      shown.current = spans.length
      finish()
      return
    }

    let raf = 0
    let last = performance.now()
    let wait = 0 // ms left of a pause
    let budget = 0 // units owed at the current pace
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100)
      last = now
      const backlog = spans.length - shown.current
      // Letters (or words) a second: the even pace, or faster to clear a backlog in time.
      const unitsPerLetter = reveal === 'word' ? 5 : 1
      const rate = Math.max(speed / unitsPerLetter, backlog / CATCH_UP_S)
      const catchingUp = backlog / CATCH_UP_S > speed / unitsPerLetter
      if (wait > 0 && !catchingUp) wait -= dt
      else {
        budget += (rate * dt) / 1000
        while (budget >= 1 && shown.current < spans.length) {
          const s = spans[shown.current++]
          s.setAttribute('data-on', '')
          litAt[shown.current - 1] = now
          budget -= 1
          const ch = (s.textContent ?? '').trimEnd().slice(-1) || (s.textContent ?? '')
          const pause = PAUSE[ch]
          if (pause && !catchingUp) {
            wait = pause
            budget = 0
            break
          }
        }
        if (shown.current >= spans.length) budget = 0
      }
      placeCaret(now)
      if (shown.current < spans.length) raf = requestAnimationFrame(tick)
      else finish()
    }
    if (shown.current < spans.length) raf = requestAnimationFrame(tick)
    else finish()
    return () => cancelAnimationFrame(raf)
  }, [units, streaming, speed, reveal, caret])

  React.useEffect(() => () => caretEl.current?.remove(), [])

  return (
    <div
      ref={box}
      data-slot="streaming-text"
      data-reveal={reveal}
      aria-busy={streaming || undefined}
      className={cn('satin-stream text-body whitespace-pre-wrap text-text-default', className)}
      {...props}
    >
      {units.map((u, i) => (
        <span key={i} className="satin-stream-unit">
          {u}
        </span>
      ))}
    </div>
  )
}
