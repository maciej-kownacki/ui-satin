'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

export type BadgeTone = 'neutral' | 'brand' | 'sky' | 'green' | 'amber' | 'red' | 'fuchsia' | 'plum'

/**
 * Badge, 1:1 with the uiKit `Badge` set (988:20203): eight tones, Large (8 × 4 padding, 24
 * high) or Small (6 × 2, 20 high), Soft (tone fill) or Plain (no fill), radius-sm or full.
 * Label medium 13/16, icon 14px in the tone colour, 4px apart. No border, no shadow.
 * The tone comes from `data-tone`, which repoints the `tone/*` tokens.
 */
const badgeVariants = cva(
  [
    'inline-flex shrink-0 items-center gap-1 text-sm leading-4 font-medium tracking-normal whitespace-nowrap text-tone-fg',
    '[&_svg]:pointer-events-none [&_svg]:size-icon-size-sm [&_svg]:shrink-0 [&_svg]:[stroke-width:1.875]',
  ],
  {
    variants: {
      size: {
        lg: 'px-2 py-1',
        sm: 'px-1.5 py-0.5',
      },
      variant: {
        soft: 'bg-tone-bg',
        plain: 'bg-transparent',
      },
      shape: {
        default: 'rounded-sm',
        rounded: 'rounded-pill',
      },
    },
    defaultVariants: { size: 'lg', variant: 'soft', shape: 'default' },
  },
)

export interface BadgeProps extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  tone?: BadgeTone
}

export function Badge({ className, tone = 'neutral', size, variant, shape, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-tone={tone}
      className={cn(badgeVariants({ size, variant, shape }), className)}
      {...props}
    />
  )
}

export { badgeVariants }
