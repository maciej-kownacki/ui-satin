import * as React from 'react'
import { Toggle as TogglePrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

/**
 * Toggle, 1:1 with the uiKit `Toggle` set (852:21771): a button that stays pressed. Two
 * variants, outline (bg/popover, border/default, radius-lg) and ghost (no fill, radius-md),
 * two sizes, md 32 (14/21) and sm 28 (13/18), 10px side padding, a 16px icon 8px from the
 * label, and a square icon-only form.
 *
 * At rest the label and icon are text/muted. Hover: bg/muted (outline adds border/strong).
 * Focus: an action/primary border, plus the 2px focus ring on outline. Pressed:
 * action/secondary/bg-pressed (outline with border/strong), text/default; pressed + focus
 * adds the ring on both. Disabled: text/subtle, outline on bg/muted. Ghost rounds to radius-lg
 * whenever it is hovered, focused or pressed, as in Figma.
 *
 * States use satin-hover / satin-focus (or data-force), pressed is Radix's data-state="on".
 */
const toggleVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 border font-medium whitespace-nowrap select-none text-text-muted',
    'transition-[background-color,border-color,color,box-shadow,border-radius] duration-(--duration-fast) ease-(--ease-out)',
    'focus-visible:outline-none disabled:pointer-events-none disabled:text-text-subtle',
    'satin-hover:text-text-default satin-focus:text-text-default data-[state=on]:text-text-default',
    // Figma icons are 1.25px at 16; on Iconoir's 24 grid that is 1.875.
    '[&_svg]:pointer-events-none [&_svg]:size-icon-size [&_svg]:shrink-0 [&_svg]:[stroke-width:1.875]',
  ],
  {
    variants: {
      variant: {
        outline: [
          'rounded-lg border-border-default bg-bg-popover',
          'satin-hover:border-border-strong satin-hover:bg-bg-muted',
          'satin-focus:border-action-primary-bg satin-focus:bg-bg-popover satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
          'data-[state=on]:border-border-strong data-[state=on]:bg-action-secondary-bg-pressed',
          'data-[state=on]:satin-hover:border-border-strong data-[state=on]:satin-hover:bg-action-secondary-bg-pressed',
          'data-[state=on]:satin-focus:border-action-primary-bg data-[state=on]:satin-focus:bg-action-secondary-bg-pressed',
          'disabled:border-border-default disabled:bg-bg-muted',
          'disabled:data-[state=on]:border-border-default disabled:data-[state=on]:bg-action-secondary-bg-pressed',
        ],
        ghost: [
          'rounded-md border-transparent bg-transparent',
          'satin-hover:rounded-lg satin-hover:bg-bg-muted',
          // Figma's ghost focus is the primary border alone (its ring is 0px); pressed + focus has the ring.
          'satin-focus:rounded-lg satin-focus:border-action-primary-bg satin-focus:[box-shadow:none]',
          'data-[state=on]:rounded-lg data-[state=on]:bg-action-secondary-bg-pressed',
          'data-[state=on]:satin-hover:bg-action-secondary-bg-pressed',
          'data-[state=on]:satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
          'disabled:rounded-md disabled:data-[state=on]:rounded-md',
        ],
      },
      size: {
        md: 'h-control-height-lg px-2.5 text-base',
        sm: 'h-control-height px-2.5 text-sm leading-[18px]',
      },
      iconOnly: {
        true: 'px-0',
        false: '',
      },
    },
    compoundVariants: [
      { iconOnly: true, size: 'md', className: 'w-control-height-lg' },
      { iconOnly: true, size: 'sm', className: 'w-control-height' },
    ],
    defaultVariants: { variant: 'outline', size: 'md', iconOnly: false },
  },
)

export interface ToggleProps
  extends React.ComponentProps<typeof TogglePrimitive.Root>,
    VariantProps<typeof toggleVariants> {
  /** A 16px icon before the label, or the only content when `iconOnly` (then pass an aria-label). */
  icon?: React.ReactNode
  /** Show a state without interacting, for state sheets. */
  'data-force'?: 'hover' | 'focus'
}

export function Toggle({ className, variant, size, iconOnly, icon, children, ...props }: ToggleProps) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, iconOnly }), className)}
      {...props}
    >
      {icon}
      {!iconOnly && children}
    </TogglePrimitive.Root>
  )
}

export { toggleVariants }
