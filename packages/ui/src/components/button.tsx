'use client'

import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'
import { Spinner } from './spinner'

/**
 * Button, 1:1 with the uiKit `button` component set (10:1838): five styles, four sizes
 * xs / md / lg / xl (24 / 28 / 32 / 36), Default or Rounded shape, and an icon-only form.
 *
 * Solid styles (primary, destructive, inverse) are a border in the style's `border`
 * token, an outer ring of the same width in the current background and a 0 3 6 drop shadow (gone when
 * pressed); no inner glow. Focus adds a 2px `action/focus-ring` spread; disabled
 * is the default look at 50% opacity, and so is `aria-disabled` (still focusable, no hover or
 * press, clicks swallowed). Icons take the label colour on solid styles and
 * text/muted on secondary and tertiary.
 *
 * Shadows are written as plain box-shadow, not Tailwind's shadow utilities: those compose
 * five custom properties, and a browser that drops one of them drops the whole shadow.
 *
 * States use the satin-hover / satin-focus / satin-pressed variants (styles/index.css):
 * the real pseudo-classes, or `data-force="hover" | "focus" | "pressed"` for state sheets.
 * An open menu's trigger looks pressed, which hides the ring; with keyboard focus on it the
 * `[aria-haspopup][aria-expanded=true]:focus-visible` rules bring the ring back.
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center overflow-clip font-medium whitespace-nowrap select-none',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-(--duration-fast) ease-(--ease-out)',
    // A menu or popover trigger snaps back to full size the moment it opens (no scale, no
    // transform transition), so the menu measures the button's real edge and never jumps.
    'not-aria-expanded:not-data-disabled:active:scale-[0.97] aria-expanded:[transition-property:background-color,border-color,color,box-shadow]',
    'disabled:pointer-events-none disabled:opacity-50',
    // aria-disabled (not while loading): the disabled look, but it keeps its focus and its pointer
    // events, so a Tooltip can say why. satin-hover and satin-pressed skip [data-disabled].
    'data-disabled:cursor-not-allowed data-disabled:opacity-50',
    // Focus: the ring 2px off the button, so it reads against the page whatever the fill.
    // (outline-solid too: the base focus rule sets the outline style to none.)
    'satin-focus:outline-2 satin-focus:outline-solid satin-focus:outline-offset-2 satin-focus:outline-action-focus-ring',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    // Figma icons are 1.25px at 16 and 1.09px at 14; on Iconoir's 24 grid both are 1.875.
    '[&_svg]:[stroke-width:1.875]',
  ],
  {
    variants: {
      variant: {
        primary: [
          'border border-strong border-action-primary-border bg-action-primary-bg text-action-primary-fg',
          '[box-shadow:0_0_0_var(--border-width-strong)_var(--action-primary-bg),0_3px_6px_0_var(--action-primary-shadow)]',
          'satin-hover:bg-action-primary-bg-hover satin-hover:[box-shadow:0_0_0_var(--border-width-strong)_var(--action-primary-bg-hover),0_3px_6px_0_var(--action-primary-shadow)]',
          'satin-focus:[box-shadow:0_0_0_var(--border-width-strong)_var(--action-primary-bg),0_3px_6px_0_var(--action-primary-shadow)]',
          'satin-pressed:bg-action-primary-bg-pressed satin-pressed:[box-shadow:0_0_0_var(--border-width-strong)_var(--action-primary-bg-pressed)]',
        ],
        destructive: [
          'border border-strong border-action-destructive-border bg-action-destructive-bg text-text-on-solid',
          '[box-shadow:0_0_0_var(--border-width-strong)_var(--action-destructive-bg),0_3px_6px_0_var(--action-primary-shadow)]',
          'satin-hover:bg-action-destructive-bg-hover satin-hover:[box-shadow:0_0_0_var(--border-width-strong)_var(--action-destructive-bg-hover),0_3px_6px_0_var(--action-primary-shadow)]',
          'satin-focus:[box-shadow:0_0_0_var(--border-width-strong)_var(--action-destructive-bg),0_3px_6px_0_var(--action-primary-shadow)]',
          'satin-pressed:bg-action-destructive-bg-pressed satin-pressed:[box-shadow:0_0_0_var(--border-width-strong)_var(--action-destructive-bg-pressed)]',
        ],
        inverse: [
          'border border-strong border-action-inverse-border bg-action-inverse-bg text-text-on-inverse',
          '[box-shadow:0_0_0_var(--border-width-strong)_var(--action-inverse-bg),0_3px_6px_0_var(--action-primary-shadow)]',
          'satin-hover:bg-action-inverse-bg-hover satin-hover:[box-shadow:0_0_0_var(--border-width-strong)_var(--action-inverse-bg-hover),0_3px_6px_0_var(--action-primary-shadow)]',
          'satin-focus:[box-shadow:0_0_0_var(--border-width-strong)_var(--action-inverse-bg),0_3px_6px_0_var(--action-primary-shadow)]',
          'satin-pressed:bg-action-inverse-bg-pressed satin-pressed:[box-shadow:0_0_0_var(--border-width-strong)_var(--action-inverse-bg-pressed)]',
        ],
        // The outline is a ring outside the box, like the filled variants' ring, so all of
        // them read the same height; the border underneath takes the fill.
        secondary: [
          'border border-strong border-transparent bg-bg-popover text-text-default [&_svg]:text-text-muted',
          '[box-shadow:0_0_0_var(--border-width-strong)_var(--border-default),0_1px_2px_1px_var(--effect-shadow-xs)]',
          'disabled:[box-shadow:0_0_0_var(--border-width-strong)_var(--border-strong)]',
          'data-disabled:[box-shadow:0_0_0_var(--border-width-strong)_var(--border-strong)]',
          'satin-hover:bg-action-secondary-bg-hover satin-hover:[box-shadow:0_0_0_var(--border-width-strong)_var(--border-strong),0_1px_2px_1px_var(--effect-shadow-xs)]',
          'satin-focus:bg-bg-popover satin-focus:[box-shadow:0_0_0_var(--border-width-strong)_var(--border-strong),0_1px_2px_1px_var(--effect-shadow-xs)]',
          'satin-pressed:bg-action-secondary-bg-pressed satin-pressed:[box-shadow:0_0_0_var(--border-width-strong)_var(--border-strong)]',
        ],
        tertiary: [
          'bg-transparent text-text-default [&_svg]:text-text-muted',
          'satin-hover:bg-bg-hover',
          'satin-focus:bg-bg-hover satin-focus:[box-shadow:none]',
          'satin-pressed:bg-bg-pressed',
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
        rounded: 'rounded-pill',
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
  /**
   * Busy: a Spinner takes the middle and the label and icons turn invisible but keep their room,
   * so the button doesn't change width. Clicks (and Enter in a form) do nothing; the button
   * keeps its focus and looks, with `aria-busy` and `aria-disabled` for screen readers.
   */
  loading?: boolean
  /**
   * `aria-disabled` (true) keeps the button focusable and hoverable but makes it look disabled
   * and swallows its clicks: for an action that can't run yet and says why (a Tooltip, or a
   * line it points to with `aria-describedby`). `disabled` takes it out of the tab order.
   * The guard covers the `onClick` passed to Button only: with `asChild`, the child's own
   * onClick still runs, and a trigger that opens on pointerdown (a Radix menu) still opens.
   */
  'aria-disabled'?: React.AriaAttributes['aria-disabled']
}

/**
 * What a ButtonGroup hands its buttons: the variant, size and shape they take unless they set
 * their own. Lives here so Button reads it without importing the group.
 */
export type ButtonDefaults = Pick<VariantProps<typeof buttonVariants>, 'variant' | 'size' | 'shape'>

export const ButtonDefaultsContext = React.createContext<ButtonDefaults | null>(null)

export function Button({ className, variant, size, shape, iconOnly, asChild = false, loading = false, type, onClick, children, 'aria-disabled': ariaDisabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  const group = React.useContext(ButtonDefaultsContext)
  const resolved = variant ?? group?.variant ?? 'primary'
  // Blocked: aria-disabled without loading, which has a look of its own.
  const blocked = !loading && (ariaDisabled === true || ariaDisabled === 'true')
  return (
    <Comp
      data-slot="button"
      data-variant={resolved}
      type={asChild ? undefined : (type ?? 'button')}
      aria-busy={loading || undefined}
      aria-disabled={loading || ariaDisabled || undefined}
      data-loading={loading || undefined}
      data-disabled={blocked || undefined}
      className={cn(
        buttonVariants({ variant: resolved, size: size ?? group?.size, shape: shape ?? group?.shape, iconOnly }),
        loading && 'relative cursor-progress',
        className,
      )}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        if (loading || blocked) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <span className="invisible contents">{children}</span>
          <span className="absolute inset-0 grid place-items-center">
            <Spinner size={(size ?? group?.size) === 'xs' ? 'sm' : 'md'} label={null} />
          </span>
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { buttonVariants }
