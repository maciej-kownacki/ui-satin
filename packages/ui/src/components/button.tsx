import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

/**
 * Button, from the uiKit `button` page: five variants, four sizes (24 / 28 / 32 / 36),
 * a rectangle or pill shape, and an icon-only form. Pressing scales it to 0.97.
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-medium select-none',
    'transition-[background-color,color,box-shadow,transform] duration-(--duration-fast) ease-(--ease-out)',
    'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-action-primary-bg text-text-on-solid shadow-primary',
          'hover:bg-action-primary-bg-hover active:bg-action-primary-bg-pressed focus-visible:shadow-primary-focus',
        ],
        destructive: [
          'bg-action-destructive-bg text-text-on-solid shadow-destructive',
          'hover:bg-action-destructive-bg-hover active:bg-action-destructive-bg-pressed focus-visible:shadow-destructive-focus',
        ],
        secondary: [
          'border border-border-strong bg-bg-popover text-text-default shadow-xs',
          'hover:bg-action-secondary-bg-hover active:bg-action-secondary-bg-pressed focus-visible:shadow-xs-focus',
        ],
        tertiary: [
          'bg-transparent text-text-default',
          'hover:bg-action-secondary-bg-hover active:bg-action-secondary-bg-pressed focus-visible:shadow-border-focus',
        ],
        inverse: [
          'bg-action-inverse-bg text-text-on-inverse',
          'shadow-[0_0_0_1px_var(--action-inverse-bg),inset_0_0_6px_2px_var(--action-inverse-glow)]',
          'hover:bg-action-inverse-bg-hover active:bg-action-inverse-bg-pressed',
          'focus-visible:shadow-[0_0_0_2px_var(--action-focus-ring),0_0_0_1px_var(--action-inverse-bg)]',
        ],
      },
      size: {
        xs: 'h-control-height-xs px-2 text-xs [&_svg]:size-icon-size-sm',
        default: 'h-control-height px-2.5 text-sm [&_svg]:size-icon-size',
        lg: 'h-control-height-lg px-3 text-sm [&_svg]:size-icon-size',
        xl: 'h-control-height-xl px-3 text-base [&_svg]:size-icon-size',
      },
      shape: {
        rectangle: 'rounded-md',
        pill: 'rounded-full',
      },
      iconOnly: {
        true: 'px-0',
        false: '',
      },
    },
    compoundVariants: [
      { iconOnly: true, size: 'xs', className: 'w-control-height-xs' },
      { iconOnly: true, size: 'default', className: 'w-control-height' },
      { iconOnly: true, size: 'lg', className: 'w-control-height-lg' },
      { iconOnly: true, size: 'xl', className: 'w-control-height-xl' },
    ],
    defaultVariants: { variant: 'primary', size: 'default', shape: 'rectangle', iconOnly: false },
  },
)

export interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  /** Render the child element (a link, say) with the button's styles instead of a `<button>`. */
  asChild?: boolean
}

export function Button({ className, variant, size, shape, iconOnly, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size, shape, iconOnly }), className)}
      {...props}
    />
  )
}

export { buttonVariants }
