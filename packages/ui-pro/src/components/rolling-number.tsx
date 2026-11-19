'use client'

import * as React from 'react'
import { cn } from '@uisatin/ui/lib/utils'

/**
 * RollingNumber: a count whose digits roll when it changes. Each character that differs slides
 * out as the new one slides in, 150 ms on --ease-out: up when the number grows, down when it
 * shrinks. Under reduced motion it just changes. Satin Pro's counts use it (the Bulk action bar's
 * "3 selected", the Filter bar's "14 deals"); the rules are styles/components/rolling-number.css.
 *
 * It is `aria-hidden`: put the number in words next to it (`sr-only`), since the rolling
 * characters would read as noise.
 *
 * @internal Shared by Satin Pro's own components; not part of the public API and may change in any release.
 */

const REDUCED = '(prefers-reduced-motion: reduce)'
const subscribeMotion = (onChange: () => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const list = window.matchMedia(REDUCED)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

/** Whether the system asks for reduced motion, kept up to date. */
export const useReducedMotion = () =>
  React.useSyncExternalStore(
    subscribeMotion,
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(REDUCED).matches,
    () => false,
  )

export interface RollingNumberProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** The number as shown, already formatted ("1,204"). */
  text: string
  /** The number itself: which way the digits roll. */
  value: number
}

/** The digits of `text`, rolling from the old to the new when they differ. Other props, `ref` included, go to its `span`. */
export function RollingNumber({ text, value, className, ...props }: RollingNumberProps) {
  const reduced = useReducedMotion()
  const last = React.useRef({ text, value })
  const [roll, setRoll] = React.useState<{ from: string; dir: 'up' | 'down'; key: number } | null>(null)
  const round = React.useRef(0)
  React.useLayoutEffect(() => {
    const prev = last.current
    if (prev.text === text) return
    last.current = { text, value }
    setRoll(reduced ? null : { from: prev.text, dir: value > prev.value ? 'up' : 'down', key: ++round.current })
  }, [text, value, reduced])

  const width = Math.max(text.length, roll?.from.length ?? 0)
  const to = text.padStart(width, ' ')
  const from = (roll?.from ?? text).padStart(width, ' ')
  return (
    <span data-slot="rolling-number" aria-hidden className={cn('inline-flex tabular-nums', className)} {...props}>
      {[...to].map((ch, i) =>
        roll && from[i] !== ch ? (
          <span key={`${roll.key}-${i}`} className="satin-roll" data-dir={roll.dir}>
            <span data-roll="out">{from[i] === ' ' ? '' : from[i]}</span>
            <span data-roll="in" onAnimationEnd={() => setRoll((r) => (r?.key === roll.key ? null : r))}>
              {ch === ' ' ? '' : ch}
            </span>
          </span>
        ) : ch === ' ' ? null : (
          <span key={i}>{ch}</span>
        ),
      )}
    </span>
  )
}
