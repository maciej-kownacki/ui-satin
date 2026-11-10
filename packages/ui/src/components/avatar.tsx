'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'
import { Tooltip } from './tooltip'

export type AvatarTone = 'neutral' | 'brand' | 'sky' | 'green' | 'amber' | 'red' | 'fuchsia' | 'plum'
export type AvatarSize = 16 | 20 | 24 | 32 | 40 | 48

/**
 * Avatar, 1:1 with the uiKit `Avatar` set (992:20199): initials on a tone fill, the same eight
 * hue pairs as Badge (`tone/bg` fill, `tone/fg` text, no border), six px sizes and a Circle or
 * Rounded shape. Rounded steps the radius with the size: 4 / 4 / 6 / 8 / 10 / 12.
 *
 * Type per size, from Figma: 16 → SemiBold 7/8, 20 → SemiBold 9/10 (no kit token for either),
 * 24 → text/2xs SemiBold, 32 → Label/sm 13/16, 40 → Label/lg 14/14, 48 → text/lg Medium.
 * Groups (docs example 3889:7365) overlap with -8px and stack the first on top.
 *
 * With `name` the avatar says who it is: it becomes an image named after the person, takes
 * keyboard focus, and shows the name in a Tooltip. On hover the tooltip waits 400 ms — the middle
 * of the 0.3–0.5 s NN/g recommends, so a pointer passing over a row of faces doesn't flash names —
 * and stays 150 ms after the pointer leaves. Keyboard focus shows it at once.
 */
const avatarVariants = cva(
  'inline-flex shrink-0 items-center justify-center overflow-clip bg-tone-bg text-center whitespace-nowrap text-tone-fg select-none',
  {
    variants: {
      size: {
        16: 'size-4 text-[7px] leading-[8px] font-semibold tracking-normal',
        20: 'size-5 text-[9px] leading-[10px] font-semibold tracking-normal',
        24: 'size-6 text-2xs font-semibold',
        32: 'size-8 text-sm leading-4 font-medium tracking-normal',
        40: 'size-10 text-base leading-[14px] font-medium tracking-normal',
        48: 'size-12 text-lg font-medium',
      },
      shape: {
        circle: 'rounded-full',
        rounded: '',
      },
    },
    compoundVariants: [
      { shape: 'rounded', size: 16, className: 'rounded-xs' },
      { shape: 'rounded', size: 20, className: 'rounded-xs' },
      { shape: 'rounded', size: 24, className: 'rounded-sm' },
      { shape: 'rounded', size: 32, className: 'rounded-md' },
      { shape: 'rounded', size: 40, className: 'rounded-lg' },
      { shape: 'rounded', size: 48, className: 'rounded-xl' },
    ],
    defaultVariants: { size: 32, shape: 'circle' },
  },
)

export interface AvatarProps
  extends Omit<React.ComponentProps<'span'>, 'children'>,
    Omit<VariantProps<typeof avatarVariants>, 'size'> {
  /** One or two letters, or a count like "+3" at the end of a group. */
  initials: string
  tone?: AvatarTone
  size?: AvatarSize
  /** The person's name: shown in a tooltip on hover and focus, and read by screen readers. */
  name?: string
}

/** NN/g: wait 0.3–0.5 s before showing hidden content on hover; we take the middle. */
export const AVATAR_TOOLTIP_DELAY = 400
const AVATAR_TOOLTIP_CLOSE = 150

export function Avatar({ className, initials, tone = 'neutral', size = 32, shape, name, ...props }: AvatarProps) {
  const avatar = (
    <span
      data-slot="avatar"
      data-tone={tone}
      {...(name ? { role: 'img', 'aria-label': name, tabIndex: 0 } : {})}
      className={cn(
        avatarVariants({ size, shape }),
        name && 'outline-none focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
        className,
      )}
      {...props}
    >
      <span aria-hidden={name ? true : undefined}>{initials}</span>
    </span>
  )
  if (!name) return avatar
  return (
    <Tooltip label={name} delay={AVATAR_TOOLTIP_DELAY} closeDelay={AVATAR_TOOLTIP_CLOSE}>
      {avatar}
    </Tooltip>
  )
}

export { avatarVariants }
