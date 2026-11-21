'use client'

import * as React from 'react'
import { cn } from '../lib/utils'

/**
 * Progress, 1:1 with the uiKit `Progress` set (4025:3851): a bg/muted track, 4px (sm) or 8px
 * (md), fully rounded, with the done part in action/primary/bg. Above it, optionally, a label
 * row 8px up: the label (13px medium, text/default) on the left and the percentage (13px,
 * text/muted) on the right.
 *
 * Leave `value` out while the amount is unknown: a third of the track then slides across.
 * The bar moves to a new value over 300 ms on ease-out. It slides rather than resizes (a clip
 * the track's width, moved back by what is left to do), so nothing is laid out on the way.
 *
 * A `progressbar` with aria-valuenow (and the label as its name) when there is a value.
 */
export interface ProgressProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** 0 to `max`; left out, the bar is indeterminate. */
  value?: number | null
  max?: number
  label?: React.ReactNode
  /** The percentage at the right of the label row. */
  showValue?: boolean
  size?: 'sm' | 'md'
  /** How the value reads on the right and to screen readers. Defaults to a whole percentage. */
  formatValue?: (value: number, max: number) => string
}

const percent = (value: number, max: number) => `${Math.round((value / max) * 100)}%`

export function Progress({
  value,
  max = 100,
  label,
  showValue = true,
  size = 'sm',
  formatValue = percent,
  className,
  'aria-label': ariaLabel,
  ...props
}: ProgressProps) {
  const labelId = React.useId()
  const known = value != null
  const v = known ? Math.min(max, Math.max(0, value)) : 0
  const text = known ? formatValue(v, max) : undefined

  return (
    <div data-slot="progress" data-size={size} className={cn('flex w-full flex-col gap-2', className)} {...props}>
      {(label || (showValue && known)) && (
        <div className="flex items-center justify-between gap-3 text-sm leading-5">
          {label ? (
            <span id={labelId} className="min-w-0 truncate font-medium text-text-default">
              {label}
            </span>
          ) : (
            <span />
          )}
          {showValue && known && (
            <span aria-hidden className="shrink-0 text-text-muted tabular-nums">
              {text}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : ariaLabel}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={known ? v : undefined}
        aria-valuetext={text}
        className={cn('relative w-full overflow-hidden rounded-full bg-bg-muted', size === 'md' ? 'h-2' : 'h-1')}
      >
        {known ? (
          // The clip, rounded at its end, slides back by what is left to do; the bar in it, rounded
          // at its start, slides forward by as much, so the bar stays on the track and only its
          // end moves. At rest both ends are drawn as before. Mirrored right to left (a scale, left
          // out of the transition so a change of direction doesn't play the flip).
          <div
            className="h-full w-full overflow-hidden rounded-r-full transition-[transform] duration-300 ease-(--ease-out) rtl:-scale-x-100"
            style={{ transform: `translateX(-${100 - (v / max) * 100}%)` }}
          >
            <div
              className="h-full w-full rounded-l-full bg-action-primary-bg transition-[transform] duration-300 ease-(--ease-out)"
              style={{ transform: `translateX(${100 - (v / max) * 100}%)` }}
            />
          </div>
        ) : (
          // Starts at the reading side; right to left it slides the other way (motion.css).
          <div className="absolute inset-y-0 start-0 w-1/3 rounded-full bg-action-primary-bg animate-[satin-progress-indeterminate_1.4s_var(--ease-in-out)_infinite] rtl:animate-[satin-progress-indeterminate-rtl_1.4s_var(--ease-in-out)_infinite]" />
        )}
      </div>
    </div>
  )
}
