import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

export type DotTone = 'fuchsia' | 'sky' | 'plum' | 'green'

/**
 * Dot, 1:1 with the uiKit `Dot` set (369:6759, page dotIndicator): a 16px box with an 8px
 * indicator in the middle, in the tone's `tone/fg` colour. Solid is a filled circle; outline
 * is the same 8px circle drawn with a 1px stroke inside it, nothing in the middle.
 *
 * With a `label` the dot is an image with that name; without one it is decorative and hidden
 * from assistive tech (pair it with visible text, as the docs ask).
 */
const dotVariants = cva(
  'block size-2 rounded-full',
  {
    variants: {
      variant: {
        solid: 'bg-tone-fg',
        outline: 'border border-tone-fg',
      },
    },
    defaultVariants: { variant: 'solid' },
  },
)

export interface DotProps extends Omit<React.ComponentProps<'span'>, 'children'>, VariantProps<typeof dotVariants> {
  tone?: DotTone
  /** Accessible name, e.g. "Running". Leave it out when visible text already says it. */
  label?: string
}

export function Dot({ className, tone = 'fuchsia', variant, label, ...props }: DotProps) {
  return (
    <span
      data-slot="dot"
      data-tone={tone}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-flex size-4 shrink-0 items-center justify-center', className)}
      {...props}
    >
      <span className={dotVariants({ variant })} />
    </span>
  )
}

export { dotVariants }
