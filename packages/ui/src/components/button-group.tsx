'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { ButtonDefaultsContext, type ButtonDefaults } from './button'

/**
 * Buttons that belong together: a toolbar, Prev / Next, a set of views, the two halves of a
 * SplitButton.
 *
 * `attached` (the default) joins them into one block: the inner corners go square, the buttons
 * touch, and the only line between two of them is the later one's leading border (the
 * outline colour on secondary). Each button's outer ring and shadow are clipped on the sides it
 * shares, so they run unbroken along the top and bottom of the block, with no notch at a seam. The button under the
 * pointer or with focus comes to the front, so its ring and focus ring are never cut by a
 * neighbour. `attached={false}` keeps every button whole, 8px apart (4px at xs), for a looser
 * toolbar; put a `ButtonGroupSeparator` between sets there.
 *
 * `variant`, `size` and `shape` are defaults for every Button inside (a button's own prop wins),
 * so a group is set once instead of on each button. The group is `role="group"`: give it an
 * `aria-label` that says what the buttons are for ("Text alignment").
 */
export interface ButtonGroupProps extends React.ComponentProps<'div'>, ButtonDefaults {
  orientation?: 'horizontal' | 'vertical'
  /** Join the buttons into one block. */
  attached?: boolean
}

export function ButtonGroup({
  orientation = 'horizontal',
  attached = true,
  variant,
  size,
  shape,
  className,
  children,
  ...props
}: ButtonGroupProps) {
  const defaults = React.useMemo(() => ({ variant, size, shape }), [variant, size, shape])
  const horizontal = orientation === 'horizontal'
  return (
    <ButtonDefaultsContext.Provider value={defaults}>
      <div
        role="group"
        data-slot="button-group"
        data-orientation={orientation}
        data-attached={attached || undefined}
        className={cn(
          'inline-flex w-fit',
          horizontal ? 'flex-row items-center' : 'flex-col items-stretch',
          attached
            ? [
                '[&>*]:relative [&>*:hover]:z-10 [&>*:focus-visible]:z-20 [&>*:focus-visible]:[clip-path:none]!',
                horizontal
                  ? [
                      // Logical sides, so the block joins the same way right to left.
                      '[&>*:not(:first-child)]:rounded-s-none [&>*:not(:last-child)]:rounded-e-none [&>*:not(:last-child)]:border-e-0',
                      '[&>[data-variant=secondary]:not(:first-child)]:border-s-border-default',
                      '[&>*:not(:last-child)]:[clip-path:inset(-12px_0_-12px_-12px)] [&>*:not(:first-child)]:[clip-path:inset(-12px_-12px_-12px_0)]',
                      // clip-path has no logical form: right to left, the shared side is the other one.
                      '[&>*:not(:last-child)]:rtl:[clip-path:inset(-12px_-12px_-12px_0)] [&>*:not(:first-child)]:rtl:[clip-path:inset(-12px_0_-12px_-12px)]',
                      '[&>*:not(:first-child):not(:last-child)]:[clip-path:inset(-12px_0)]',
                    ]
                  : [
                      '[&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none [&>*:not(:last-child)]:border-b-0',
                      '[&>[data-variant=secondary]:not(:first-child)]:border-t-border-default',
                      '[&>*:not(:last-child)]:[clip-path:inset(-12px_-12px_0_-12px)] [&>*:not(:first-child)]:[clip-path:inset(0_-12px_-12px_-12px)]',
                      '[&>*:not(:first-child):not(:last-child)]:[clip-path:inset(0_-12px)]',
                    ],
              ]
            : size === 'xs'
              ? 'gap-1'
              : 'gap-2',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </ButtonDefaultsContext.Provider>
  )
}

/** A thin rule between sets of buttons in a loose (`attached={false}`) group or a toolbar. */
export function ButtonGroupSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      data-slot="button-group-separator"
      className={cn(
        'shrink-0 self-center bg-border-default',
        // Vertical in a row, horizontal in a column.
        'h-4 w-(--border-width-default) [[data-orientation=vertical]>&]:h-(--border-width-default) [[data-orientation=vertical]>&]:w-full',
        className,
      )}
      {...props}
    />
  )
}
