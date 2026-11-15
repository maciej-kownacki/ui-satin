'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { useSatinLabels } from './labels'

/**
 * Spinner: something is on its way and there's no telling how far along it is (for that, use
 * Progress). A 1.5px ring at 20% under a quarter arc in the current colour, so it takes the
 * colour of the text or button it sits in. Sizes follow the icon scale: xs 12, sm 14, md 16,
 * lg 20. It turns once every 800ms, and still turns (at half speed) under reduced motion, since
 * a stopped arc reads as stuck.
 *
 * On its own it is a `role="status"` named "Loading" (or `label`). Inside something that
 * already says it's busy (a loading Button, a row with its own text) pass `label={null}` and it
 * is hidden from screen readers.
 */
export interface SpinnerProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** What's loading, for screen readers. `null` hides the spinner from them. */
  label?: string | null
}

const px = { xs: 12, sm: 14, md: 16, lg: 20 }

export function Spinner({ size = 'md', label, className, ...props }: SpinnerProps) {
  const labels = useSatinLabels()
  const s = px[size]
  const hidden = label === null
  return (
    <span
      data-slot="spinner"
      data-size={size}
      role={hidden ? undefined : 'status'}
      aria-label={hidden ? undefined : (label ?? labels.loading)}
      aria-hidden={hidden || undefined}
      className={cn('inline-grid shrink-0 place-items-center', className)}
      {...props}
    >
      <svg width={s} height={s} viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeOpacity="0.2" style={{ strokeWidth: 1.5 }} />
        <path d="M8 1.75A6.25 6.25 0 0 1 14.25 8" stroke="currentColor" strokeLinecap="round" style={{ strokeWidth: 1.5 }} />
      </svg>
    </span>
  )
}
