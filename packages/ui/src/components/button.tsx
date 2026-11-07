import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

/**
 * Button, 1:1 with the uiKit `button` component set (10:1838): five styles, four sizes
 * xs / md / lg / xl (24 / 28 / 32 / 36), Default or Rounded shape, and an icon-only form.
 *
 * Solid styles (primary, destructive, inverse) are a 1px border in the style's `border`
 * token, a 1px outer ring in the current background, a 0 3 6 drop shadow (gone when
 * pressed) and a 6px inner glow. Focus adds a 2px `action/focus-ring` spread; disabled
 * is the default look at 50% opacity. Icons take the label colour on solid styles and
 * text/muted on secondary and tertiary.
 *
 * Shadows are written as plain box-shadow, not Tailwind's shadow utilities: those compose
 * five custom properties, and a browser that drops one of them drops the whole shadow.
 *
 * States use the satin-hover / satin-focus / satin-pressed variants (styles/index.css):
 * the real pseudo-classes, or `data-force="hover" | "focus" | "pressed"` for state sheets.
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center overflow-clip font-medium whitespace-nowrap select-none',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-(--duration-fast) ease-(--ease-out)',
    // A menu or popover trigger snaps back to full size the moment it opens (no scale, no
    // transform transition), so the menu measures the button's real edge and never jumps.
    'not-aria-expanded:active:scale-[0.97] aria-expanded:[transition-property:background-color,border-color,color,box-shadow]',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
    // Figma icons are 1.25px at 16 and 1.09px at 14; on Iconoir's 24 grid both are 1.875.
    '[&_svg]:[stroke-width:1.875]',
  ],
  {
    variants: {
      variant: {
        primary: [
          'border border-action-primary-border bg-action-primary-bg text-action-primary-fg',
          '[box-shadow:0_0_0_1px_var(--action-primary-bg),0_3px_6px_0_var(--action-primary-shadow),inset_0_0_6px_2px_var(--action-primary-glow)]',
          'satin-hover:bg-action-primary-bg-hover satin-hover:[box-shadow:0_0_0_1px_var(--action-primary-bg-hover),0_3px_6px_0_var(--action-primary-shadow),inset_0_0_6px_2px_var(--action-primary-glow)]',
          'satin-focus:[box-shadow:0_0_0_1px_var(--action-primary-bg),0_3px_6px_0_var(--action-primary-shadow),0_0_0_2px_var(--action-focus-ring),inset_0_0_6px_2px_var(--action-primary-glow)]',
          'satin-pressed:bg-action-primary-bg-pressed satin-pressed:[box-shadow:0_0_0_1px_var(--action-primary-bg-pressed),inset_0_0_6px_2px_var(--action-primary-glow)]',
        ],
        destructive: [
          'border border-action-destructive-border bg-action-destructive-bg text-text-on-solid',
          '[box-shadow:0_0_0_1px_var(--action-destructive-bg),0_3px_6px_0_var(--action-primary-shadow),inset_0_0_6px_2px_var(--action-destructive-glow)]',
          'satin-hover:bg-action-destructive-bg-hover satin-hover:[box-shadow:0_0_0_1px_var(--action-destructive-bg-hover),0_3px_6px_0_var(--action-primary-shadow),inset_0_0_6px_2px_var(--action-destructive-glow)]',
          'satin-focus:[box-shadow:0_0_0_1px_var(--action-destructive-bg),0_3px_6px_0_var(--action-primary-shadow),0_0_0_2px_var(--action-focus-ring),inset_0_0_6px_2px_var(--action-destructive-glow)]',
          'satin-pressed:bg-action-destructive-bg-pressed satin-pressed:[box-shadow:0_0_0_1px_var(--action-destructive-bg-pressed),inset_0_0_6px_2px_var(--action-destructive-glow)]',
        ],
        inverse: [
          'border border-action-inverse-border bg-action-inverse-bg text-text-on-inverse',
          '[box-shadow:0_0_0_1px_var(--action-inverse-bg),0_3px_6px_0_var(--action-primary-shadow),inset_0_0_6px_2px_var(--action-inverse-glow)]',
          'satin-hover:bg-action-inverse-bg-hover satin-hover:[box-shadow:0_0_0_1px_var(--action-inverse-bg-hover),0_3px_6px_0_var(--action-primary-shadow),inset_0_0_6px_2px_var(--action-inverse-glow)]',
          'satin-focus:[box-shadow:0_0_0_1px_var(--action-inverse-bg),0_3px_6px_0_var(--action-primary-shadow),0_0_0_2px_var(--action-focus-ring),inset_0_0_6px_2px_var(--action-inverse-glow)]',
          'satin-pressed:bg-action-inverse-bg-pressed satin-pressed:[box-shadow:0_0_0_1px_var(--action-inverse-bg-pressed),inset_0_0_6px_2px_var(--action-inverse-glow)]',
        ],
        secondary: [
          'border border-border-default bg-bg-popover text-text-default [box-shadow:0_1px_2px_0_var(--effect-shadow-xs)] [&_svg]:text-text-muted',
          'disabled:border-border-strong disabled:[box-shadow:none]',
          'satin-hover:border-border-strong satin-hover:bg-action-secondary-bg-hover',
          'satin-focus:border-border-strong satin-focus:bg-bg-popover satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
          'satin-pressed:border-border-strong satin-pressed:bg-action-secondary-bg-pressed satin-pressed:[box-shadow:none]',
        ],
        tertiary: [
          'bg-transparent text-text-default [&_svg]:text-text-muted',
          'satin-hover:bg-bg-hover',
          'satin-focus:bg-bg-hover satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
          'satin-pressed:bg-border-input',
        ],
      },
      size: {
        xs: 'h-control-height-xs gap-1 px-2 text-sm [&_svg]:size-icon-size-sm',
        md: 'h-control-height gap-1.5 px-2.5 text-sm [&_svg]:size-icon-size',
        lg: 'h-control-height-lg gap-1.5 px-3 text-sm [&_svg]:size-icon-size',
        xl: 'h-control-height-xl gap-2 px-3 text-base [&_svg]:size-icon-size',
      },
      shape: {
        default: '',
        rounded: 'rounded-full',
      },
      iconOnly: {
        true: 'px-0',
        false: '',
      },
    },
    compoundVariants: [
      // Default shape: the radius grows with the size (8 / 10 / 10 / 12).
      { shape: 'default', size: 'xs', className: 'rounded-md' },
      { shape: 'default', size: 'md', className: 'rounded-lg' },
      { shape: 'default', size: 'lg', className: 'rounded-lg' },
      { shape: 'default', size: 'xl', className: 'rounded-xl' },
      { iconOnly: true, size: 'xs', className: 'w-control-height-xs' },
      { iconOnly: true, size: 'md', className: 'w-control-height' },
      { iconOnly: true, size: 'lg', className: 'w-control-height-lg' },
      { iconOnly: true, size: 'xl', className: 'w-control-height-xl' },
    ],
    defaultVariants: { variant: 'primary', size: 'md', shape: 'default', iconOnly: false },
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
