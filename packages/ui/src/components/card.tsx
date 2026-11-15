'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Xmark } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { useSatinLabels } from './labels'

/**
 * Card, 1:1 with the uiKit `Card` set (1122:20156): bg/card, 1px border/default, radius-2xl (16),
 * no shadow, 405 wide by default. Three stacked sections with no gap between them:
 *
 * - header: title in Label/lg (14/14 medium), description in text/sm muted, 2px apart.
 *   Padding 16 / 16 / 0 on md, 12 / 12 / 0 on sm (no bottom padding: the body's top padding
 *   is the space under it).
 * - body (children): 16 padding on md, 12 on sm, children 8 apart.
 * - footer: same padding as the body; its items sit in a row, 8 apart.
 *
 * `onClose` adds a tertiary 28px icon button 7px from the top-right corner.
 */
const cardVariants = cva(
  'relative flex w-[405px] max-w-full flex-col overflow-clip rounded-2xl border border-border-default bg-bg-card',
  {
    variants: {
      size: {
        md: '[--card-pad:calc(var(--spacing)*4)]',
        sm: '[--card-pad:calc(var(--spacing)*3)]',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

export interface CardProps extends Omit<React.ComponentProps<'div'>, 'title'>, VariantProps<typeof cardVariants> {
  title?: React.ReactNode
  description?: React.ReactNode
  footer?: React.ReactNode
  /** Shows the close button. */
  onClose?: () => void
  /** Accessible name of the close button. Defaults to the `close` label. */
  closeLabel?: string
}

export function Card({
  className,
  size,
  title,
  description,
  footer,
  onClose,
  closeLabel,
  children,
  ...props
}: CardProps) {
  const labels = useSatinLabels()
  const titleId = React.useId()
  const hasHeader = title != null || description != null
  return (
    <div
      data-slot="card"
      role={title != null ? 'group' : undefined}
      aria-labelledby={title != null ? titleId : undefined}
      className={cn(cardVariants({ size }), className)}
      {...props}
    >
      {hasHeader && (
        <div data-slot="card-header" className={cn('flex flex-col gap-0.5 px-(--card-pad) pt-(--card-pad)', onClose && 'pe-10')}>
          {title != null && (
            <div id={titleId} className="text-base leading-[14px] font-medium tracking-normal text-text-default">
              {title}
            </div>
          )}
          {description != null && <p className="text-body text-text-muted">{description}</p>}
        </div>
      )}
      {children != null && (
        <div data-slot="card-body" className="flex flex-col gap-2 p-(--card-pad)">
          {children}
        </div>
      )}
      {footer != null && (
        <div data-slot="card-footer" className="flex items-center gap-2 p-(--card-pad)">
          {footer}
        </div>
      )}
      {onClose && (
        <Button
          variant="tertiary"
          iconOnly
          aria-label={closeLabel ?? labels.close}
          onClick={onClose}
          className="absolute end-[7px] top-[7px]"
        >
          <Xmark aria-hidden />
        </Button>
      )}
    </div>
  )
}

export { cardVariants }
