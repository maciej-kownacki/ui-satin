'use client'

import * as React from 'react'
import { cn } from '../lib/utils'

/**
 * Separator: a 1px rule in border/default between blocks of content, across (horizontal) or
 * down (vertical, as tall as its row).
 *
 * With a `label` it becomes a rule with a word in the middle ("or" between sign-in options,
 * "Today" in a feed), 13px muted, 12px from the lines on either side.
 *
 * Most rules are only visual, so it is `decorative` by default and screen readers skip it;
 * set `decorative={false}` when it really splits the content into parts (`role="separator"`).
 */
export interface SeparatorProps extends React.ComponentProps<'div'> {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
  /** A word in the middle of a horizontal rule. */
  label?: React.ReactNode
}

export function Separator({ orientation = 'horizontal', decorative = true, label, className, ...props }: SeparatorProps) {
  const semantics = decorative
    ? { role: 'none' as const }
    : { role: 'separator' as const, 'aria-orientation': orientation }

  if (label && orientation === 'horizontal')
    return (
      <div
        data-slot="separator"
        data-orientation={orientation}
        {...semantics}
        className={cn('flex w-full items-center gap-3 text-sm text-text-muted', className)}
        {...props}
      >
        <span className="h-px flex-1 bg-border-default" />
        <span className="shrink-0">{label}</span>
        <span className="h-px flex-1 bg-border-default" />
      </div>
    )

  return (
    <div
      data-slot="separator"
      data-orientation={orientation}
      {...semantics}
      className={cn(
        'shrink-0 bg-border-default',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch',
        className,
      )}
      {...props}
    />
  )
}
