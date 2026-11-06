import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

export type BadgeTone = 'neutral' | 'brand' | 'sky' | 'green' | 'amber' | 'red' | 'fuchsia' | 'plum'

/**
 * Badge, from the uiKit `badge` page: eight tones, two sizes (24 / 20), Soft (with a border)
 * or Plain, default or rounded. The tone comes from `data-tone`, which repoints the
 * `tone/*` tokens, so one set of classes covers every colour.
 */
const badgeVariants = cva(
  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap bg-tone-bg font-medium text-tone-fg [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      size: {
        lg: 'h-6 px-2 text-sm [&_svg]:size-icon-size-sm',
        sm: 'h-5 px-1.5 text-xs [&_svg]:size-3',
      },
      look: {
        soft: 'border border-tone-border',
        plain: 'border border-transparent',
      },
      shape: {
        default: 'rounded-sm',
        rounded: 'rounded-full',
      },
    },
    defaultVariants: { size: 'lg', look: 'soft', shape: 'default' },
  },
)

export interface BadgeProps extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  tone?: BadgeTone
}

export function Badge({ className, tone = 'neutral', size, look, shape, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-tone={tone}
      className={cn(badgeVariants({ size, look, shape }), className)}
      {...props}
    />
  )
}

export { badgeVariants }
