'use client'

import * as React from 'react'
import { cn } from '@uisatin/ui/lib/utils'

/**
 * RollingNumber: a count whose changed digits roll, the old one sliding out as the new one
 * slides in (150 ms): up when it grows, down when it shrinks. Under reduced motion it just
 * changes. The Bulk action bar's "3 selected" uses it.
 *
 * It's hidden from screen readers (digits mid-roll read as noise): put the number as text next
 * to it, in an `sr-only` span, or announce it some other way. Other props, `ref` included, go
 * to its `span`.
 */
export interface RollingNumberProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** The number as shown, already formatted: "1,204". */
  text: string
  /** The number itself, which picks the way the digits roll. */
  value: number
}

const REDUCED = '(prefers-reduced-motion: reduce)'
const subscribeMotion = (onChange: () => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const list = window.matchMedia(REDUCED)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

/** Whether the system asks for reduced motion; false on the server. */
export const useReducedMotion = () =>
  React.useSyncExternalStore(
    subscribeMotion,
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(REDUCED).matches,
    () => false,
  )

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

  // Right-aligned, so units stay over units while the number gains or loses a digit.
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
