import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

/**
 * EmptyState, 1:1 with the uiKit `EmptyState` set (852:51897) and its `_buttonGroup`
 * (852:51922): a centred column 350 wide (320–560), padding 16 / 16 / 20, 16 apart, radius-2xl.
 *
 * - icon: a 16px glyph in text/default on a bg/muted tile, 10 padding, radius-lg (36 square).
 * - title in text/lg medium (16/24), description in Body/lg (14/21) text/muted, 8 apart, centred.
 * - actions: a row of Buttons 8 apart: Primary + Secondary, Secondary alone, or a Tertiary
 *   "Learn more" with a trailing arrow. Pass them as `<Button>` elements.
 * - border: ghost (none), dashed or outline, both 1px border/default.
 */
const emptyStateVariants = cva(
  'flex w-[350px] max-w-[560px] min-w-[min(320px,100%)] flex-col items-center gap-4 rounded-2xl px-4 pt-4 pb-5 text-center',
  {
    variants: {
      border: {
        ghost: '',
        dashed: 'border border-dashed border-border-default',
        outline: 'border border-border-default',
      },
    },
    defaultVariants: { border: 'ghost' },
  },
)

export interface EmptyStateProps
  extends Omit<React.ComponentProps<'div'>, 'title'>,
    VariantProps<typeof emptyStateVariants> {
  title: React.ReactNode
  description?: React.ReactNode
  /** A 16px icon, e.g. from iconoir-react. */
  icon?: React.ReactNode
  /** One or two Buttons. */
  actions?: React.ReactNode
}

export function EmptyState({ className, border, title, description, icon, actions, ...props }: EmptyStateProps) {
  return (
    <div data-slot="empty-state" className={cn(emptyStateVariants({ border }), className)} {...props}>
      {icon && (
        <div
          aria-hidden
          className="flex shrink-0 items-center justify-center rounded-lg bg-bg-muted p-2.5 text-text-default [&_svg]:size-4 [&_svg]:[stroke-width:1.875]"
        >
          {icon}
        </div>
      )}
      <div className="flex w-full flex-col items-center gap-2">
        <p className="w-full text-lg font-medium text-text-default">{title}</p>
        {description && <p className="w-full text-body-lg text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-start justify-center gap-2">{actions}</div>}
    </div>
  )
}

export { emptyStateVariants }
