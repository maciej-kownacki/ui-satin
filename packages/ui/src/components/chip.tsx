'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'
import type { BadgeTone } from './badge'
import { useSatinLabels } from './labels'

/**
 * Chip, 1:1 with the uiKit `Chip` set (3206:79959): Subtle or Outline, md (28, control-height)
 * or sm (24, control-height-xs), eight tones like Badge, an optional dot, avatar and remove
 * button. Label medium 13/19.5, 8px side padding; the dot, avatar and close slots overlap
 * the label padding by 4px, as in Figma.
 *
 * Neutral is its own look: Outline is a popover surface with a border-default edge and an
 * xs drop shadow, Subtle is the secondary action fill. Every other tone uses the `tone/*`
 * tokens (repointed by `data-tone`): tone-bg fill, tone-border edge, tone-fg text; hover and
 * pressed fill with tone-border.
 *
 * States (satin-hover / satin-focus / satin-pressed, or `data-force`):
 * - hover: neutral outline bg-hover + border-strong; neutral subtle border-input fill.
 * - pressed: neutral border-input fill with a border-strong edge, no drop shadow.
 * - focus: the 2px action/focus-ring spread, border-strong edge, no drop shadow.
 * - disabled: 50% opacity, no drop shadow.
 * Subtle pressed's 1px edge is an inset shadow so the chip doesn't grow by 2px.
 *
 * With `onRemove` the chip is a `span` holding a real remove button (a button can't hold
 * a button); without it, the chip itself is the button.
 */
const chipVariants = cva(
  [
    'group/chip relative inline-flex shrink-0 items-center rounded-pill whitespace-nowrap select-none',
    'text-sm leading-(--text-sm--line-height) font-medium',
    'transition-[background-color,border-color,color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
    'focus-visible:outline-none',
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[disabled]:[box-shadow:none]',
  ],
  {
    variants: {
      variant: {
        outline: 'border',
        subtle: '',
      },
      size: {
        md: 'h-control-height',
        sm: 'h-control-height-xs',
      },
      neutral: { true: 'text-text-default', false: 'text-tone-fg' },
    },
    compoundVariants: [
      {
        variant: 'outline',
        neutral: true,
        className: [
          'border-border-default bg-bg-popover [box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]',
          'satin-hover:border-border-strong satin-hover:bg-bg-hover',
          'satin-focus:border-border-strong satin-focus:bg-bg-popover satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
          'has-[button:focus-visible]:border-border-strong has-[button:focus-visible]:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
          'satin-pressed:border-border-strong satin-pressed:bg-border-input satin-pressed:[box-shadow:none]',
          'data-[disabled]:border-border-strong',
        ],
      },
      {
        variant: 'outline',
        neutral: false,
        className: [
          'border-tone-border bg-tone-bg [box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]',
          'satin-hover:bg-tone-border',
          'satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
          'has-[button:focus-visible]:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
          'satin-pressed:bg-tone-border satin-pressed:[box-shadow:none]',
        ],
      },
      {
        variant: 'subtle',
        neutral: true,
        className: [
          'bg-action-secondary-bg',
          'satin-hover:bg-border-input',
          'satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
          'has-[button:focus-visible]:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
          'satin-pressed:bg-border-input satin-pressed:[box-shadow:inset_0_0_0_1px_var(--border-strong)]',
        ],
      },
      {
        variant: 'subtle',
        neutral: false,
        className: [
          'bg-tone-bg',
          'satin-hover:bg-tone-border',
          'satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
          'has-[button:focus-visible]:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
          'satin-pressed:bg-tone-border',
        ],
      },
    ],
    defaultVariants: { variant: 'subtle', size: 'md', neutral: true },
  },
)

type ChipBaseProps = Omit<VariantProps<typeof chipVariants>, 'neutral'> & {
  tone?: BadgeTone
  /** A status dot before the label. */
  dot?: boolean
  /** A 16px avatar before the label (an initials avatar or an image). */
  avatar?: React.ReactNode
  /** Shows the close button; called when it's clicked. */
  onRemove?: () => void
  /** Accessible name of the remove button. Defaults to the `removeItem` label with the chip's text ("Remove Design"). */
  removeLabel?: string
  disabled?: boolean
  children?: React.ReactNode
  className?: string
}

export type ChipProps = ChipBaseProps &
  Omit<React.ComponentProps<'button'>, keyof ChipBaseProps> & {
    'data-force'?: 'hover' | 'focus' | 'pressed'
  }

/** The Figma close glyph, 16 at 1.25 (14 at 1.09 on sm). */
function CloseGlyph({ size }: { size: 14 | 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4.50551 11.4951L8.0006 8M8.0006 8L11.4957 4.50491M8.0006 8L4.50551 4.50491M8.0006 8L11.4957 11.4951"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Chip({
  className,
  variant = 'subtle',
  size = 'md',
  tone = 'neutral',
  dot = false,
  avatar,
  onRemove,
  removeLabel,
  disabled = false,
  children,
  type,
  ...props
}: ChipProps) {
  const labels = useSatinLabels()
  const neutral = tone === 'neutral'
  const iconSize = size === 'sm' ? 14 : 16
  const classes = cn(chipVariants({ variant, size, neutral }), className)
  const label = typeof children === 'string' ? children : undefined

  const content = (
    <>
      {dot && (
        // Dot slot: 4px in, a 16px box with an 8px status dot (status/green fg in Figma).
        <span data-slot="chip-dot" className="-me-1 flex shrink-0 items-center ps-1" aria-hidden>
          <span className="grid size-4 place-items-center">
            <span className="size-2 rounded-full bg-status-green-fg" />
          </span>
        </span>
      )}
      {avatar && (
        <span
          data-slot="chip-avatar"
          className="-me-1 flex shrink-0 items-center ps-1 [&>*]:size-4 [&>*]:rounded-full"
        >
          {avatar}
        </span>
      )}
      <span data-slot="chip-label" className={cn('flex shrink-0 items-center px-2', onRemove && '-me-1')}>
        {children}
      </span>
      {onRemove && (
        <span className="flex shrink-0 items-center pe-1">
          <button
            type="button"
            data-slot="chip-remove"
            disabled={disabled}
            aria-label={removeLabel ?? (label ? labels.removeItem(label) : labels.remove)}
            onClick={onRemove}
            className={cn(
              'grid shrink-0 place-items-center rounded-pill focus-visible:outline-none',
              neutral ? 'text-text-muted' : 'text-tone-fg',
            )}
          >
            <CloseGlyph size={iconSize} />
          </button>
        </span>
      )}
    </>
  )

  if (onRemove) {
    // The chip is a span holding the remove button; id, aria-*, data-* and handlers go on it too.
    return (
      <span
        {...(props as React.ComponentProps<'span'>)}
        data-slot="chip"
        data-tone={tone}
        data-disabled={disabled || undefined}
        className={classes}
      >
        {content}
      </span>
    )
  }

  return (
    <button
      data-slot="chip"
      data-tone={tone}
      data-disabled={disabled || undefined}
      type={type ?? 'button'}
      disabled={disabled}
      className={classes}
      {...props}
    >
      {content}
    </button>
  )
}

/** The 16px initials avatar from Figma (Avatar 992:20199 at size 16): tone-bg, 7px semibold tone-fg. */
export function ChipAvatar({ initials, tone, className }: { initials: string; tone?: BadgeTone; className?: string }) {
  return (
    <span
      data-tone={tone}
      aria-hidden
      className={cn(
        'grid size-4 shrink-0 place-items-center overflow-hidden rounded-full bg-tone-bg text-[7px] leading-2 font-semibold text-tone-fg',
        className,
      )}
    >
      {initials}
    </span>
  )
}

export { chipVariants }
